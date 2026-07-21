use std::{
    collections::{HashMap, HashSet},
    fs::{self, File},
    io::{self, Read, Write},
    path::{Path, PathBuf},
};

use rusqlite::OptionalExtension;
use serde_json::json;
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

use crate::{
    errors::{AppError, AppResult},
    models::{
        CreateHandoffInput, HandoffExportResult, HandoffPreview, HandoffSettings,
        ProjectFile,
    },
    platform,
    repositories::{
        HandoffRepository, ProjectDetailRepository, ProjectFileRepository,
    },
    state::AppState,
};

pub struct HandoffService;

impl HandoffService {
    pub fn preview(state: &AppState, project_id: i64) -> AppResult<HandoffPreview> {
        let connection = state.database().connection()?;
        let project = ProjectDetailRepository::get(&connection, project_id)?;
        let settings = HandoffRepository::settings(&connection, project_id)?;
        let files = ProjectFileRepository::list(&connection, project_id)?;
        let mut warnings = Vec::new();
        if project.bpm.is_none() {
            warnings.push("Falta el BPM del proyecto".into());
        }
        if project.musical_key.is_none() {
            warnings.push("Falta la tonalidad del proyecto".into());
        }
        let has_preview = project.preview_path.as_deref().is_some_and(|preview_path| {
            files.iter().any(|file| file.file_path == preview_path && !file.is_missing)
        });
        if !has_preview {
            warnings.push("No hay un preview principal disponible".into());
        }
        if !files.iter().any(|file| file.category == "stem" && !file.is_missing) {
            warnings.push("No hay stems asociados".into());
        }
        if files.iter().any(|file| file.is_missing) {
            warnings.push("Algunos archivos asociados ya no existen".into());
        }
        Ok(HandoffPreview {
            settings,
            files,
            warnings,
            next_version: HandoffRepository::next_version(&connection, project_id)?,
        })
    }

    pub fn export(
        state: &AppState,
        project_id: i64,
        input: CreateHandoffInput,
    ) -> AppResult<HandoffExportResult> {
        let settings = normalize_settings(input.settings)?;
        if input.selections.is_empty() && !input.include_project_file {
            return Err(AppError::InvalidProject(
                "Selecciona al menos un archivo para el paquete".into(),
            ));
        }
        let parent = platform::canonicalize_directory(&input.destination_parent)?;
        let (project, version_number, selected, analyses) = {
            let connection = state.database().connection()?;
            let project = ProjectDetailRepository::get(&connection, project_id)?;
            let version = HandoffRepository::next_version(&connection, project_id)?;
            let all_files = ProjectFileRepository::list(&connection, project_id)?;
            let by_id = all_files
                .into_iter()
                .map(|file| (file.id, file))
                .collect::<HashMap<_, _>>();
            let mut selected = Vec::new();
            let mut ids = HashSet::new();
            for selection in &input.selections {
                if !ids.insert(selection.file_id) {
                    return Err(AppError::InvalidProject(
                        "Un archivo no puede incluirse dos veces".into(),
                    ));
                }
                validate_variant(&selection.variant)?;
                let file = by_id
                    .get(&selection.file_id)
                    .ok_or(AppError::AssociatedFileNotFound)?;
                if file.is_missing {
                    return Err(AppError::InvalidProject(format!(
                        "El archivo {} ya no existe",
                        file.file_name
                    )));
                }
                selected.push((file.clone(), selection.variant.clone()));
            }
            let mut analyses = HashMap::new();
            for (file, _) in &selected {
                let analysis = connection
                    .query_row(
                        "SELECT sample_rate, bit_depth FROM audio_analysis WHERE file_id = ?1",
                        [file.id],
                        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<i64>>(1)?)),
                    )
                    .optional()?;
                if let Some(analysis) = analysis {
                    analyses.insert(file.id, analysis);
                }
            }
            (project, version, selected, analyses)
        };

        let safe_name = safe_component(&project.display_name);
        let package_name = format!("{} — Handoff v{}", safe_name, version_number);
        let final_archive = parent.join(format!("{package_name}.zip"));
        if final_archive.exists() {
            return Err(AppError::InvalidProject(
                "Ya existe un archivo ZIP con esa versión en el destino".into(),
            ));
        }
        let temporary_name = format!(
            ".chilli-handoff-{}-{}-{}",
            project_id,
            version_number,
            std::process::id()
        );
        let staging = parent.join(&temporary_name);
        let temporary_archive = parent.join(format!("{temporary_name}.zip.tmp"));
        if staging.exists() || temporary_archive.exists() {
            return Err(AppError::InvalidProject(
                "Existe una exportación temporal pendiente en el destino".into(),
            ));
        }
        fs::create_dir(&staging).map_err(AppError::FileOperation)?;

        let export_result = (|| -> AppResult<(i64, Vec<serde_json::Value>)> {
            let mut checksums = Vec::new();
            let mut manifest_files = Vec::new();
            let mut file_count = 0_i64;

            for (file, variant) in &selected {
                let is_primary_preview =
                    project.preview_path.as_deref() == Some(file.file_path.as_str());
                let directory = package_directory(file, variant, is_primary_preview);
                let target_directory = staging.join(directory);
                fs::create_dir_all(&target_directory).map_err(AppError::FileOperation)?;
                let target = unique_target(&target_directory, &file.file_name);
                let source = dunce::canonicalize(&file.file_path).map_err(AppError::FileOperation)?;
                let hash = copy_with_hash(&source, &target)?;
                let relative = target
                    .strip_prefix(&staging)
                    .map_err(|_| AppError::InvalidPath("ruta exportada fuera del paquete".into()))?
                    .to_string_lossy()
                    .replace('\\', "/");
                checksums.push((hash, relative.clone()));
                let analysis = analyses.get(&file.id);
                manifest_files.push(json!({
                    "path": relative,
                    "category": if is_primary_preview { "preview" } else { file.category.as_str() },
                    "variant": variant,
                    "sourceFileName": file.file_name,
                    "sampleRate": analysis.map(|value| value.0),
                    "bitDepth": analysis.and_then(|value| value.1)
                }));
                file_count += 1;
            }

            if input.include_project_file {
                let source = dunce::canonicalize(&project.file_path).map_err(AppError::FileOperation)?;
                if source.is_file() {
                    let directory = staging.join("Project Files");
                    fs::create_dir_all(&directory).map_err(AppError::FileOperation)?;
                    let target = unique_target(&directory, &project.original_name);
                    let hash = copy_with_hash(&source, &target)?;
                    let relative = target
                        .strip_prefix(&staging)
                        .map_err(|_| AppError::InvalidPath("ruta exportada fuera del paquete".into()))?
                        .to_string_lossy()
                        .replace('\\', "/");
                    checksums.push((hash, relative.clone()));
                    manifest_files.push(json!({
                        "path": relative,
                        "category": "project",
                        "variant": "original",
                        "sourceFileName": project.original_name
                    }));
                    file_count += 1;
                }
            }

            let sample_rates = analyses.values().map(|value| value.0).collect::<HashSet<_>>();
            let bit_depths = analyses.values().filter_map(|value| value.1).collect::<HashSet<_>>();
            let manifest = json!({
                "schemaVersion": 1,
                "packageVersion": version_number,
                "project": {
                    "name": project.display_name,
                    "originalFile": project.original_name,
                    "daw": project.daw,
                    "dawVersion": settings.daw_version,
                    "bpm": project.bpm,
                    "musicalKey": project.musical_key,
                    "timeSignature": settings.time_signature,
                    "commonStart": settings.common_start,
                    "sampleRates": sorted_values(sample_rates),
                    "bitDepths": sorted_values(bit_depths),
                    "plugins": settings.plugins,
                    "notesForCollaborator": settings.collaborator_notes
                },
                "files": manifest_files
            });
            fs::write(
                staging.join("Project Info.json"),
                serde_json::to_vec_pretty(&manifest)?,
            )
            .map_err(AppError::FileOperation)?;

            let checksum_text = checksums
                .iter()
                .map(|(hash, path)| format!("{hash}  {path}"))
                .collect::<Vec<_>>()
                .join("\n");
            fs::write(staging.join("Checksums.sha256"), checksum_text)
                .map_err(AppError::FileOperation)?;

            let readme_lines = readme_lines(
                &project.display_name,
                &project.daw,
                version_number,
                &settings,
                project.bpm,
                project.musical_key.as_deref(),
                file_count,
            );
            write_simple_pdf(&staging.join("README.pdf"), &readme_lines)?;
            Ok((file_count, manifest_files))
        })();

        let (file_count, _) = match export_result {
            Ok(result) => result,
            Err(error) => {
                cleanup_staging(&staging, &parent);
                return Err(error);
            }
        };

        let archive_result = write_zip_archive(&staging, &temporary_archive);
        cleanup_staging(&staging, &parent);
        if let Err(error) = archive_result {
            cleanup_archive(&temporary_archive, &parent);
            return Err(error);
        }
        if let Err(error) = fs::rename(&temporary_archive, &final_archive) {
            cleanup_archive(&temporary_archive, &parent);
            return Err(AppError::FileOperation(error));
        }

        let destination_path = final_archive.to_string_lossy().into_owned();
        let record_result = {
            let mut connection = state.database().connection()?;
            HandoffRepository::save_export(
                &mut connection,
                project_id,
                &settings,
                version_number,
                &destination_path,
                file_count,
            )
        };
        if let Err(error) = record_result {
            return Err(AppError::InvalidProject(format!(
                "El paquete se creó, pero no se pudo registrar en Chilli Beat: {error}"
            )));
        }

        Ok(HandoffExportResult {
            destination_path,
            version_number,
            file_count,
        })
    }

    pub fn open_destination(
        state: &AppState,
        project_id: i64,
        path: &str,
    ) -> AppResult<()> {
        let connection = state.database().connection()?;
        if !HandoffRepository::export_exists(&connection, project_id, path)? {
            return Err(AppError::InvalidPath(
                "El paquete no pertenece al historial del proyecto".into(),
            ));
        }
        drop(connection);
        let stored = Path::new(path);
        if stored.is_dir() {
            let canonical = platform::canonicalize_directory(path)?;
            return platform::open_path(&canonical);
        }
        let canonical = dunce::canonicalize(stored)
            .map_err(|error| AppError::InvalidPath(format!("No se pudo resolver el ZIP: {error}")))?;
        let is_zip = canonical.is_file()
            && canonical.extension().and_then(|value| value.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("zip"));
        if !is_zip {
            return Err(AppError::InvalidPath(
                "El archivo Handoff ya no existe o no es un ZIP válido".into(),
            ));
        }
        platform::reveal_path(&canonical)
    }
}

fn normalize_settings(mut settings: HandoffSettings) -> AppResult<HandoffSettings> {
    settings.daw_version = normalize_optional(settings.daw_version, 80)?;
    settings.collaborator_notes = normalize_optional(settings.collaborator_notes, 5_000)?;
    settings.time_signature = settings.time_signature.trim().to_owned();
    settings.common_start = settings.common_start.trim().to_owned();
    if settings.time_signature.is_empty() || settings.time_signature.chars().count() > 16 {
        return Err(AppError::InvalidProject("El compás no es válido".into()));
    }
    if settings.common_start.is_empty() || settings.common_start.chars().count() > 32 {
        return Err(AppError::InvalidProject("El punto de inicio común no es válido".into()));
    }
    if settings.plugins.len() > 200 {
        return Err(AppError::InvalidProject("Se permiten hasta 200 plugins".into()));
    }
    let mut plugins = Vec::new();
    for plugin in settings.plugins {
        let plugin = plugin.trim();
        if plugin.is_empty() {
            continue;
        }
        if plugin.chars().count() > 120 {
            return Err(AppError::InvalidProject(
                "Cada nombre de plugin admite hasta 120 caracteres".into(),
            ));
        }
        if !plugins.iter().any(|stored: &String| stored.eq_ignore_ascii_case(plugin)) {
            plugins.push(plugin.to_owned());
        }
    }
    settings.plugins = plugins;
    Ok(settings)
}

fn normalize_optional(value: Option<String>, max: usize) -> AppResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max {
        return Err(AppError::InvalidProject("Un campo del Handoff supera el límite permitido".into()));
    }
    Ok(Some(value.to_owned()))
}

fn validate_variant(value: &str) -> AppResult<()> {
    if matches!(value, "wet" | "dry" | "neutral") {
        Ok(())
    } else {
        Err(AppError::InvalidProject(
            "La variante debe ser wet, dry o neutral".into(),
        ))
    }
}

fn package_directory(file: &ProjectFile, variant: &str, is_primary_preview: bool) -> PathBuf {
    if is_primary_preview {
        return PathBuf::from("Preview");
    }
    match file.category.as_str() {
        "stem" => PathBuf::from("Audio").join("Stems").join(title_case(variant)),
        "mix" => PathBuf::from("Audio").join("Mixes"),
        "master" => PathBuf::from("Audio").join("Masters"),
        "preview" => PathBuf::from("Preview"),
        "reference" => PathBuf::from("References"),
        "midi" => PathBuf::from("MIDI"),
        "artwork" => PathBuf::from("Artwork"),
        "preset" => PathBuf::from("Extras").join("Presets"),
        "sample" => PathBuf::from("Extras").join("Samples"),
        _ => PathBuf::from("Extras").join("Other"),
    }
}

fn title_case(value: &str) -> &'static str {
    match value {
        "wet" => "Wet",
        "dry" => "Dry",
        _ => "Neutral",
    }
}

fn unique_target(directory: &Path, file_name: &str) -> PathBuf {
    let safe_name = safe_file_name(file_name);
    let initial = directory.join(&safe_name);
    if !initial.exists() {
        return initial;
    }
    let path = Path::new(&safe_name);
    let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or("File");
    let extension = path.extension().and_then(|value| value.to_str());
    for index in 2..10_000 {
        let name = match extension {
            Some(extension) => format!("{stem}-{index}.{extension}"),
            None => format!("{stem}-{index}"),
        };
        let candidate = directory.join(name);
        if !candidate.exists() {
            return candidate;
        }
    }
    directory.join(format!("{stem}-copy"))
}

fn safe_component(value: &str) -> String {
    let sanitized = value
        .trim()
        .chars()
        .map(|character| {
            if ['<', '>', ':', '"', '/', '\\', '|', '?', '*'].contains(&character) {
                '-'
            } else {
                character
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        "Project".into()
    } else {
        sanitized.trim_end_matches([' ', '.']).to_owned()
    }
}

fn safe_file_name(value: &str) -> String {
    safe_component(value)
}

fn copy_with_hash(source: &Path, target: &Path) -> AppResult<String> {
    let mut input = File::open(source).map_err(AppError::FileOperation)?;
    let mut output = File::create(target).map_err(AppError::FileOperation)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = input.read(&mut buffer).map_err(AppError::FileOperation)?;
        if read == 0 {
            break;
        }
        output.write_all(&buffer[..read]).map_err(AppError::FileOperation)?;
        hasher.update(&buffer[..read]);
    }
    output.flush().map_err(AppError::FileOperation)?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn write_zip_archive(source_root: &Path, archive_path: &Path) -> AppResult<()> {
    let output = File::create(archive_path).map_err(AppError::FileOperation)?;
    let mut archive = ZipWriter::new(output);
    let directory_options = SimpleFileOptions::default().unix_permissions(0o755);

    for entry in WalkDir::new(source_root).min_depth(1).sort_by_file_name() {
        let entry = entry.map_err(|error| AppError::HandoffArchive(error.to_string()))?;
        let relative = entry.path().strip_prefix(source_root)
            .map_err(|_| AppError::HandoffArchive("Una ruta temporal salió del paquete".into()))?;
        let name = relative.to_string_lossy().replace('\\', "/");

        if entry.file_type().is_dir() {
            archive.add_directory(format!("{name}/"), directory_options)
                .map_err(|error| AppError::HandoffArchive(error.to_string()))?;
            continue;
        }
        if !entry.file_type().is_file() {
            continue;
        }

        let metadata = entry.metadata()
            .map_err(|error| AppError::HandoffArchive(error.to_string()))?;
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644)
            .large_file(metadata.len() > u32::MAX as u64);
        archive.start_file(name, options)
            .map_err(|error| AppError::HandoffArchive(error.to_string()))?;
        let mut input = File::open(entry.path()).map_err(AppError::FileOperation)?;
        io::copy(&mut input, &mut archive).map_err(AppError::FileOperation)?;
    }

    let output = archive.finish()
        .map_err(|error| AppError::HandoffArchive(error.to_string()))?;
    output.sync_all().map_err(AppError::FileOperation)
}

fn sorted_values(values: HashSet<i64>) -> Vec<i64> {
    let mut values = values.into_iter().collect::<Vec<_>>();
    values.sort_unstable();
    values
}

fn readme_lines(
    project_name: &str,
    daw: &str,
    version: i64,
    settings: &HandoffSettings,
    bpm: Option<f64>,
    musical_key: Option<&str>,
    file_count: i64,
) -> Vec<String> {
    let mut lines = vec![
        format!("{project_name} - Universal Handoff v{version}"),
        String::new(),
        "Este paquete no convierte el proyecto entre DAWs.".into(),
        "Contiene archivos neutrales y el proyecto original cuando fue incluido.".into(),
        String::new(),
        format!("DAW de origen: {daw} {}", settings.daw_version.as_deref().unwrap_or("")),
        format!("BPM: {}", bpm.map(|value| value.to_string()).unwrap_or_else(|| "No indicado".into())),
        format!("Tonalidad: {}", musical_key.unwrap_or("No indicada")),
        format!("Compas: {}", settings.time_signature),
        format!("Inicio comun: {}", settings.common_start),
        format!("Archivos copiados: {file_count}"),
        String::new(),
        "Plugins declarados:".into(),
    ];
    if settings.plugins.is_empty() {
        lines.push("- No se declaro ningun plugin".into());
    } else {
        lines.extend(settings.plugins.iter().map(|plugin| format!("- {plugin}")));
    }
    lines.push(String::new());
    lines.push("Notas para el colaborador:".into());
    lines.push(
        settings
            .collaborator_notes
            .as_deref()
            .unwrap_or("Sin notas adicionales")
            .to_owned(),
    );
    lines
}

fn write_simple_pdf(path: &Path, lines: &[String]) -> AppResult<()> {
    let mut commands = String::from("BT\n/F1 12 Tf\n50 790 Td\n15 TL\n");
    for line in lines.iter().take(45) {
        let line = pdf_ascii(line);
        commands.push_str(&format!("({}) Tj\nT*\n", escape_pdf(&line)));
    }
    commands.push_str("ET\n");
    let objects = vec![
        "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(),
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".to_string(),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string(),
        format!("<< /Length {} >>\nstream\n{}endstream", commands.len(), commands),
    ];
    let mut output = b"%PDF-1.4\n".to_vec();
    let mut offsets = Vec::new();
    for (index, object) in objects.iter().enumerate() {
        offsets.push(output.len());
        output.extend_from_slice(format!("{} 0 obj\n{}\nendobj\n", index + 1, object).as_bytes());
    }
    let xref = output.len();
    output.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", objects.len() + 1).as_bytes());
    for offset in offsets {
        output.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    output.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            objects.len() + 1,
            xref
        )
        .as_bytes(),
    );
    fs::write(path, output).map_err(AppError::FileOperation)
}

fn pdf_ascii(value: &str) -> String {
    value.chars().map(|character| match character {
        'á' | 'à' | 'ä' | 'Á' => 'a',
        'é' | 'è' | 'ë' | 'É' => 'e',
        'í' | 'ì' | 'ï' | 'Í' => 'i',
        'ó' | 'ò' | 'ö' | 'Ó' => 'o',
        'ú' | 'ù' | 'ü' | 'Ú' => 'u',
        'ñ' | 'Ñ' => 'n',
        character if character.is_ascii() => character,
        _ => '-',
    }).collect()
}

fn escape_pdf(value: &str) -> String {
    value.replace('\\', "\\\\").replace('(', "\\(").replace(')', "\\)")
}

fn cleanup_staging(staging: &Path, expected_parent: &Path) {
    if staging.parent() == Some(expected_parent) && staging.exists() {
        let _ = fs::remove_dir_all(staging);
    }
}

fn cleanup_archive(archive: &Path, expected_parent: &Path) {
    if archive.parent() == Some(expected_parent) && archive.is_file() {
        let _ = fs::remove_file(archive);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_audio_variants_into_stable_directories() {
        let file = ProjectFile {
            id: 1,
            project_id: 1,
            file_path: "C:/stem.wav".into(),
            file_name: "stem.wav".into(),
            file_type: "wav".into(),
            category: "stem".into(),
            file_size: 1,
            created_at: String::new(),
            is_missing: false,
            origin: "manual".into(),
            source_label: None,
            relative_path: None,
        };
        assert_eq!(package_directory(&file, "wet", false), PathBuf::from("Audio/Stems/Wet"));
        assert_eq!(package_directory(&file, "dry", false), PathBuf::from("Audio/Stems/Dry"));
        assert_eq!(package_directory(&file, "neutral", true), PathBuf::from("Preview"));
    }

    #[test]
    fn sanitizes_names_without_losing_the_extension() {
        assert_eq!(safe_file_name("Bass: wet.wav"), "Bass- wet.wav");
        assert_eq!(safe_component("Midnight / Drive"), "Midnight - Drive");
    }

    #[test]
    fn writes_a_staging_tree_as_a_zip_archive() {
        let directory = tempfile::tempdir().expect("directory");
        let staging = directory.path().join("staging");
        fs::create_dir_all(staging.join("Audio/Mixes")).expect("folders");
        fs::write(staging.join("Audio/Mixes/demo.wav"), b"wave-data").expect("audio");
        fs::write(staging.join("Project Info.json"), b"{}").expect("manifest");
        let archive_path = directory.path().join("handoff.zip");

        write_zip_archive(&staging, &archive_path).expect("zip");

        let file = File::open(archive_path).expect("open");
        let mut archive = zip::ZipArchive::new(file).expect("archive");
        assert!(archive.by_name("Project Info.json").is_ok());
        let mut audio = archive.by_name("Audio/Mixes/demo.wav").expect("audio entry");
        let mut bytes = Vec::new();
        audio.read_to_end(&mut bytes).expect("read");
        assert_eq!(bytes, b"wave-data");
    }

    #[test]
    fn writes_a_valid_pdf_header_and_xref() {
        let directory = tempfile::tempdir().expect("directory");
        let path = directory.path().join("README.pdf");
        write_simple_pdf(&path, &["Demo".into(), "BPM: 120".into()]).expect("pdf");
        let bytes = fs::read(path).expect("read");
        assert!(bytes.starts_with(b"%PDF-1.4"));
        assert!(String::from_utf8_lossy(&bytes).contains("xref"));
    }
}

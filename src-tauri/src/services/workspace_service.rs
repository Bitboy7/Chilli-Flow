use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

use rusqlite::params;
use serde_json::json;
use walkdir::WalkDir;

use crate::{
    errors::{AppError, AppResult},
    models::{CreateWorkspaceInput, DawInstallation, ProjectDetail},
    platform,
    repositories::{ProjectDetailRepository, WatchedFolderRepository},
    scanner::{normalize_extension, KNOWN_DAWS},
    state::AppState,
};

pub struct WorkspaceService;

impl WorkspaceService {
    pub fn installations() -> Vec<DawInstallation> {
        KNOWN_DAWS
            .iter()
            .map(|definition| {
                let executable = detect_executable(definition.daw_name);
                DawInstallation {
                    daw: definition.daw_name.to_string(),
                    extension: definition.extension.to_string(),
                    installed: executable.is_some(),
                    executable_path: executable.map(|path| path.to_string_lossy().into_owned()),
                }
            })
            .collect()
    }

    pub fn create(state: &AppState, input: CreateWorkspaceInput) -> AppResult<ProjectDetail> {
        let name = validate_name(&input.name)?;
        let extension = normalize_extension(&input.extension).ok_or(AppError::InvalidExtension)?;
        let definition = KNOWN_DAWS
            .iter()
            .find(|item| {
                item.extension == extension && item.daw_name.eq_ignore_ascii_case(input.daw.trim())
            })
            .ok_or_else(|| {
                AppError::InvalidProject("El DAW seleccionado no coincide con la extensión".into())
            })?;
        let parent = platform::canonicalize_directory(&input.parent_directory)?;
        let root = parent.join(name);
        if root.exists() {
            return Err(AppError::InvalidProject(
                "Ya existe una carpeta con ese nombre en la ubicación seleccionada".into(),
            ));
        }

        fs::create_dir(&root).map_err(AppError::FileOperation)?;
        let creation = prepare_workspace(
            &root,
            name,
            definition.daw_name,
            &extension,
            input.template_path.as_deref(),
        );
        let (project_path, original_name, source_kind) = match creation {
            Ok(value) => value,
            Err(error) => {
                cleanup_created_root(&root, &parent);
                return Err(error);
            }
        };

        let root_string = root.to_string_lossy().into_owned();
        let project_path_string = project_path.to_string_lossy().into_owned();
        let database_result = (|| -> AppResult<i64> {
            let mut connection = state.database().connection()?;
            let transaction = connection.transaction()?;
            transaction.execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw,
                  workspace_root, source_kind)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    name,
                    original_name,
                    project_path_string,
                    extension,
                    definition.daw_name,
                    root_string,
                    source_kind
                ],
            )?;
            let project_id = transaction.last_insert_rowid();

            for (category, path) in [
                ("stems", root.join("Audio").join("Stems")),
                ("mixes", root.join("Audio").join("Mixes")),
                ("masters", root.join("Audio").join("Masters")),
                ("references", root.join("References")),
            ] {
                transaction.execute(
                    "INSERT INTO project_folders (project_id, category, folder_path)
                     VALUES (?1, ?2, ?3)",
                    params![project_id, category, path.to_string_lossy()],
                )?;
            }

            let covered = WatchedFolderRepository::list(&transaction)?
                .iter()
                .any(|folder| root.starts_with(Path::new(&folder.folder_path)));
            if !covered {
                WatchedFolderRepository::insert(&transaction, &root_string)?;
            }
            transaction.commit()?;
            Ok(project_id)
        })();

        let project_id = match database_result {
            Ok(id) => id,
            Err(error) => {
                cleanup_created_root(&root, &parent);
                return Err(error);
            }
        };
        let connection = state.database().connection()?;
        ProjectDetailRepository::get(&connection, project_id)
    }

    pub fn launch_daw(daw: &str) -> AppResult<()> {
        let executable = detect_executable(daw).ok_or_else(|| {
            AppError::InvalidProject(format!(
                "No se encontró una instalación de {daw}; configura una plantilla o abre el DAW manualmente"
            ))
        })?;
        Command::new(executable)
            .spawn()
            .map(|_| ())
            .map_err(AppError::FileOperation)
    }

    pub fn open_managed_or_project(detail: &ProjectDetail, path: &Path) -> AppResult<()> {
        if detail.source_kind == "managed_pending" {
            Self::launch_daw(&detail.daw)
        } else {
            platform::open_path(path)
        }
    }
}

fn prepare_workspace(
    root: &Path,
    name: &str,
    daw: &str,
    extension: &str,
    template_path: Option<&str>,
) -> AppResult<(PathBuf, String, &'static str)> {
    for relative in [
        "Project Files",
        "Audio/Stems",
        "Audio/Mixes",
        "Audio/Masters",
        "MIDI",
        "References",
        "Artwork",
        "Handoffs",
    ] {
        fs::create_dir_all(root.join(relative)).map_err(AppError::FileOperation)?;
    }

    let manifest = json!({
        "schemaVersion": 1,
        "name": name,
        "daw": daw,
        "projectExtension": extension,
        "createdBy": "Chilli Flow",
        "commonStart": null,
        "bpm": null,
        "musicalKey": null,
        "timeSignature": null
    });
    fs::write(
        root.join("Project Info.json"),
        serde_json::to_vec_pretty(&manifest)?,
    )
    .map_err(AppError::FileOperation)?;

    if let Some(template_path) = template_path.filter(|value| !value.trim().is_empty()) {
        let template = dunce::canonicalize(template_path).map_err(AppError::FileOperation)?;
        if !template.is_file() {
            return Err(AppError::InvalidProject(
                "La plantilla seleccionada ya no existe".into(),
            ));
        }
        let template_extension = template
            .extension()
            .and_then(|value| value.to_str())
            .and_then(normalize_extension)
            .ok_or(AppError::InvalidExtension)?;
        if template_extension != extension {
            return Err(AppError::InvalidProject(format!(
                "La plantilla debe usar la extensión {extension}"
            )));
        }
        let file_name = format!("{name}{extension}");
        let target = root.join("Project Files").join(&file_name);
        fs::copy(template, &target).map_err(AppError::FileOperation)?;
        return Ok((target, file_name, "managed"));
    }

    Ok((
        root.to_path_buf(),
        format!("{name} (esperando primer guardado)"),
        "managed_pending",
    ))
}

fn validate_name(value: &str) -> AppResult<&str> {
    let value = value.trim();
    let path = Path::new(value);
    let invalid = value.is_empty()
        || value.chars().count() > 120
        || path.components().count() != 1
        || value.ends_with('.')
        || ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
            .iter()
            .any(|character| value.contains(*character));
    if invalid {
        Err(AppError::InvalidProject(
            "El nombre debe tener entre 1 y 120 caracteres y no contener símbolos de ruta".into(),
        ))
    } else {
        Ok(value)
    }
}

fn cleanup_created_root(root: &Path, expected_parent: &Path) {
    if root.parent() == Some(expected_parent) && root.exists() {
        let _ = fs::remove_dir_all(root);
    }
}

#[cfg(target_os = "windows")]
fn detect_executable(daw: &str) -> Option<PathBuf> {
    let program_files = [
        env::var_os("ProgramFiles"),
        env::var_os("ProgramFiles(x86)"),
    ]
    .into_iter()
    .flatten()
    .map(PathBuf::from)
    .collect::<Vec<_>>();
    let (vendors, matcher): (&[&str], fn(&str) -> bool) = match daw {
        "FL Studio" => (&["Image-Line"], |name| name == "fl64.exe"),
        "Ableton Live" => (&["Ableton"], |name| {
            name.starts_with("ableton live") && name.ends_with(".exe")
        }),
        "REAPER" => (&["REAPER (x64)", "REAPER"], |name| name == "reaper.exe"),
        "Cubase" => (&["Steinberg"], |name| {
            name.starts_with("cubase") && name.ends_with(".exe")
        }),
        "Studio One" => (&["PreSonus"], |name| name == "studio one.exe"),
        "Pro Tools" => (&["Avid"], |name| name == "protools.exe"),
        "Reason" => (&["Reason Studios", "Propellerhead"], |name| {
            name == "reason.exe"
        }),
        _ => return None,
    };

    for base in &program_files {
        for vendor in vendors {
            let root = base.join(vendor);
            if let Some(found) = find_executable(&root, matcher) {
                return Some(found);
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn detect_executable(daw: &str) -> Option<PathBuf> {
    let app = match daw {
        "FL Studio" => "FL Studio.app",
        "Ableton Live" => "Ableton Live.app",
        "REAPER" => "REAPER.app",
        "Cubase" => "Cubase.app",
        "Studio One" => "Studio One.app",
        "Pro Tools" => "Pro Tools.app",
        "Logic Pro" => "Logic Pro.app",
        "GarageBand" => "GarageBand.app",
        "Reason" => "Reason.app",
        _ => return None,
    };
    let path = PathBuf::from("/Applications").join(app);
    path.exists().then_some(path)
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn detect_executable(daw: &str) -> Option<PathBuf> {
    let command = match daw {
        "REAPER" => "reaper",
        "Studio One" => "studio-one",
        _ => return None,
    };
    env::var_os("PATH").and_then(|paths| {
        env::split_paths(&paths)
            .map(|path| path.join(command))
            .find(|path| path.is_file())
    })
}

#[cfg(target_os = "windows")]
fn find_executable(root: &Path, matcher: fn(&str) -> bool) -> Option<PathBuf> {
    if !root.exists() {
        return None;
    }
    WalkDir::new(root)
        .max_depth(5)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .find(|entry| matcher(&entry.file_name().to_string_lossy().to_lowercase()))
        .map(|entry| entry.into_path())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsafe_workspace_names() {
        assert!(validate_name("../escape").is_err());
        assert!(validate_name("Album/Track").is_err());
        assert!(validate_name("Midnight Drive").is_ok());
    }

    #[test]
    fn creates_neutral_structure_without_faking_a_daw_file() {
        let parent = tempfile::tempdir().expect("parent");
        let root = parent.path().join("Demo");
        fs::create_dir(&root).expect("root");
        let (path, _, kind) =
            prepare_workspace(&root, "Demo", "FL Studio", ".flp", None).expect("workspace");
        assert_eq!(path, root);
        assert_eq!(kind, "managed_pending");
        assert!(root.join("Audio/Stems").is_dir());
        assert!(root.join("Project Files").is_dir());
        assert!(root.join("Handoffs").is_dir());
        assert!(!root.join("Project Files/Demo.flp").exists());
    }

    #[test]
    fn copies_a_matching_template_as_the_initial_project() {
        let parent = tempfile::tempdir().expect("parent");
        let root = parent.path().join("Demo");
        fs::create_dir(&root).expect("root");
        let template = parent.path().join("Template.flp");
        fs::write(&template, b"template").expect("template");
        let (path, name, kind) =
            prepare_workspace(&root, "Demo", "FL Studio", ".flp", template.to_str())
                .expect("workspace");
        assert_eq!(name, "Demo.flp");
        assert_eq!(kind, "managed");
        assert_eq!(fs::read(path).expect("copied"), b"template");
    }
}

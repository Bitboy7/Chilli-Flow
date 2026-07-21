use std::{collections::HashSet, fs, path::{Path, PathBuf}};

use walkdir::WalkDir;

use crate::{
    errors::{AppError, AppResult},
    models::{ProjectDetail, ProjectFile, ProjectFileCategory, SyncProjectFilesResult},
    platform,
    repositories::{DiscoveredProjectFile, NewProjectFile, ProjectFileRepository},
    services::ProjectDetailService,
    state::AppState,
};

const MAX_DISCOVERED_FILES: usize = 2_000;
const DISCOVERABLE_AUDIO: &[&str] = &["wav", "mp3", "flac", "ogg", "m4a", "aac", "aif", "aiff"];

pub struct ProjectFileService;

struct PreparedFile {
    path: String,
    name: String,
    file_type: String,
    size: i64,
}

struct PreparedDiscoveredFile {
    file: PreparedFile,
    category: ProjectFileCategory,
    source_label: String,
    relative_path: String,
}

#[derive(Clone)]
struct DiscoveryFolder {
    path: PathBuf,
    category: ProjectFileCategory,
    label: &'static str,
}

impl ProjectFileService {
    pub fn list(state: &AppState, project_id: i64) -> AppResult<Vec<ProjectFile>> {
        let connection = state.database().connection()?;
        ProjectFileRepository::list(&connection, project_id)
    }

    pub fn sync(state: &AppState, project_id: i64) -> AppResult<SyncProjectFilesResult> {
        let detail = ProjectDetailService::get(state, project_id)?;
        let authorized = super::project_detail_service::authorized_existing_project(state, project_id)?;
        let root = project_root(&detail, &authorized)?;
        let folders = discovery_folders(&detail, &root);
        let (prepared, scanned_folders) = discover_files(&root, folders);
        let discovered = prepared.iter().map(|entry| DiscoveredProjectFile {
            path: &entry.file.path,
            name: &entry.file.name,
            file_type: &entry.file.file_type,
            size: entry.file.size,
            category: entry.category,
            source_label: &entry.source_label,
            relative_path: &entry.relative_path,
        }).collect::<Vec<_>>();
        let mut connection = state.database().connection()?;
        let discovered_count = ProjectFileRepository::sync_discovered(
            &mut connection,
            project_id,
            &discovered,
        )?;
        let files = ProjectFileRepository::list(&connection, project_id)?;
        Ok(SyncProjectFilesResult { files, discovered_count, scanned_folders })
    }

    pub fn add(
        state: &AppState,
        project_id: i64,
        category: ProjectFileCategory,
        selected: Vec<PathBuf>,
    ) -> AppResult<Vec<ProjectFile>> {
        let prepared = selected.iter().map(|path| prepare_file(path)).collect::<AppResult<Vec<_>>>()?;
        let files = prepared.iter().map(|file| NewProjectFile {
            path: &file.path, name: &file.name, file_type: &file.file_type, size: file.size,
        }).collect::<Vec<_>>();
        let mut connection = state.database().connection()?;
        ProjectFileRepository::add_batch(&mut connection, project_id, category, &files)
    }

    pub fn remove(state: &AppState, project_id: i64, file_id: i64) -> AppResult<()> {
        let mut connection = state.database().connection()?;
        ProjectFileRepository::remove(&mut connection, project_id, file_id)
    }

    pub fn set_category(
        state: &AppState,
        project_id: i64,
        file_id: i64,
        category: ProjectFileCategory,
    ) -> AppResult<Vec<ProjectFile>> {
        let connection = state.database().connection()?;
        ProjectFileRepository::set_category(&connection, project_id, file_id, category)?;
        ProjectFileRepository::list(&connection, project_id)
    }

    pub fn open(state: &AppState, project_id: i64, file_id: i64) -> AppResult<()> {
        let path = Self::existing_path(state, project_id, file_id)?;
        platform::open_path(&path)
    }

    pub fn set_preview(state: &AppState, project_id: i64, file_id: Option<i64>) -> AppResult<()> {
        if let Some(file_id) = file_id {
            let path = Self::existing_path(state, project_id, file_id)?;
            validate_audio(&path)?;
        }
        let connection = state.database().connection()?;
        ProjectFileRepository::set_preview(&connection, project_id, file_id)?;
        Ok(())
    }

    pub fn audio_path(state: &AppState, project_id: i64, file_id: i64) -> AppResult<PathBuf> {
        let path = Self::existing_path(state, project_id, file_id)?;
        validate_audio(&path)?;
        Ok(path)
    }

    fn existing_path(state: &AppState, project_id: i64, file_id: i64) -> AppResult<PathBuf> {
        let file = {
            let connection = state.database().connection()?;
            ProjectFileRepository::get(&connection, file_id)?
        };
        if file.project_id != project_id { return Err(AppError::AssociatedFileNotFound); }
        dunce::canonicalize(file.file_path).map_err(AppError::FileOperation)
    }
}

fn project_root(detail: &ProjectDetail, authorized: &Path) -> AppResult<PathBuf> {
    if let Some(workspace_root) = detail.workspace_root.as_deref() {
        let root = dunce::canonicalize(workspace_root).map_err(AppError::FileOperation)?;
        if authorized == root || authorized.starts_with(&root) {
            return Ok(root);
        }
        return Err(AppError::UnauthorizedProjectPath);
    }
    if authorized.is_dir() {
        Ok(authorized.to_path_buf())
    } else {
        authorized.parent().map(Path::to_path_buf)
            .ok_or_else(|| AppError::InvalidProject("el archivo no tiene una carpeta de proyecto".into()))
    }
}

fn discovery_folders(detail: &ProjectDetail, root: &Path) -> Vec<DiscoveryFolder> {
    let mut folders = Vec::new();
    for (path, category, label) in [
        (detail.folders.stems.as_deref(), ProjectFileCategory::Stem, "Stems configurados"),
        (detail.folders.mixes.as_deref(), ProjectFileCategory::Mix, "Mezclas configuradas"),
        (detail.folders.masters.as_deref(), ProjectFileCategory::Master, "Masters configurados"),
        (detail.folders.references.as_deref(), ProjectFileCategory::Reference, "Referencias configuradas"),
    ] {
        if let Some(path) = path {
            folders.push(DiscoveryFolder { path: PathBuf::from(path), category, label });
        }
    }
    folders.extend(default_folders(root, &detail.daw));
    folders
}

fn default_folders(root: &Path, daw: &str) -> Vec<DiscoveryFolder> {
    let mut folders = vec![
        folder(root, "Audio/Stems", ProjectFileCategory::Stem, "Audio / Stems"),
        folder(root, "Audio/Mixes", ProjectFileCategory::Mix, "Audio / Mezclas"),
        folder(root, "Audio/Masters", ProjectFileCategory::Master, "Audio / Masters"),
        folder(root, "References", ProjectFileCategory::Reference, "Referencias"),
    ];
    if daw.to_ascii_lowercase().contains("fl studio") {
        folders.splice(0..0, [
            folder(root, "Renders/Stems", ProjectFileCategory::Stem, "Renders / Stems"),
            folder(root, "Renders/Mixes", ProjectFileCategory::Mix, "Renders / Mezclas"),
            folder(root, "Renders/Masters", ProjectFileCategory::Master, "Renders / Masters"),
        ]);
        folders.extend([
            folder(root, "Renders", ProjectFileCategory::Mix, "Renders"),
            folder(root, "Audio", ProjectFileCategory::Sample, "Audio del proyecto"),
            folder(root, "Samples", ProjectFileCategory::Sample, "Samples"),
        ]);
    }
    folders
}

fn folder(root: &Path, relative: &str, category: ProjectFileCategory, label: &'static str) -> DiscoveryFolder {
    DiscoveryFolder { path: root.join(relative), category, label }
}

fn discover_files(root: &Path, folders: Vec<DiscoveryFolder>) -> (Vec<PreparedDiscoveredFile>, usize) {
    let mut files = Vec::new();
    let mut seen_folders = HashSet::new();
    let mut seen_files = HashSet::new();
    let mut scanned_folders = 0;
    for folder in folders {
        let Ok(folder_path) = dunce::canonicalize(&folder.path) else { continue; };
        if !folder_path.is_dir() || !seen_folders.insert(folder_path.clone()) { continue; }
        scanned_folders += 1;
        for entry in WalkDir::new(&folder_path).max_depth(6).follow_links(false).into_iter().filter_map(Result::ok) {
            if files.len() >= MAX_DISCOVERED_FILES { break; }
            if !entry.file_type().is_file() { continue; }
            let extension = entry.path().extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
            if !DISCOVERABLE_AUDIO.contains(&extension.as_str()) { continue; }
            let Ok(path) = dunce::canonicalize(entry.path()) else { continue; };
            if !seen_files.insert(path.clone()) { continue; }
            let Ok(prepared) = prepare_file(&path) else { continue; };
            let relative_path = path.strip_prefix(root).or_else(|_| path.strip_prefix(&folder_path))
                .unwrap_or(path.as_path()).to_string_lossy().replace('\\', "/");
            files.push(PreparedDiscoveredFile {
                file: prepared,
                category: folder.category,
                source_label: folder.label.into(),
                relative_path,
            });
        }
        if files.len() >= MAX_DISCOVERED_FILES { break; }
    }
    (files, scanned_folders)
}

fn prepare_file(path: &Path) -> AppResult<PreparedFile> {
    let path = dunce::canonicalize(path).map_err(AppError::FileOperation)?;
    let metadata = fs::metadata(&path).map_err(AppError::FileOperation)?;
    if !metadata.is_file() { return Err(AppError::InvalidPath("se esperaba un archivo".into())); }
    let name = path.file_name().and_then(|value| value.to_str())
        .ok_or_else(|| AppError::InvalidPath("nombre no representable en UTF-8".into()))?.to_owned();
    let file_type = path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    Ok(PreparedFile {
        path: path.to_string_lossy().into_owned(), name, file_type,
        size: i64::try_from(metadata.len()).unwrap_or(i64::MAX),
    })
}

fn validate_audio(path: &Path) -> AppResult<()> {
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    if ["wav", "mp3", "flac", "ogg"].iter().any(|known| extension.eq_ignore_ascii_case(known)) {
        Ok(())
    } else {
        Err(AppError::UnsupportedAudio)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_only_mvp_preview_formats() {
        assert!(validate_audio(Path::new("preview.WAV")).is_ok());
        assert!(validate_audio(Path::new("preview.mp3")).is_ok());
        assert!(validate_audio(Path::new("preview.flac")).is_ok());
        assert!(validate_audio(Path::new("preview.ogg")).is_ok());
        assert!(validate_audio(Path::new("preview.aac")).is_err());
    }

    #[test]
    fn discovers_fl_renders_and_never_scans_backups() {
        let directory = tempfile::tempdir().expect("project");
        let root = directory.path();
        fs::create_dir_all(root.join("Renders/Mixes")).expect("mixes");
        fs::create_dir_all(root.join("Renders/Stems")).expect("stems");
        fs::create_dir_all(root.join("Backup")).expect("backups");
        fs::write(root.join("Renders/Mixes/current mix.wav"), b"mix").expect("mix");
        fs::write(root.join("Renders/Stems/drums.wav"), b"stem").expect("stem");
        fs::write(root.join("Backup/recovery.wav"), b"backup").expect("backup");

        let (files, scanned) = discover_files(root, default_folders(root, "FL Studio"));
        assert!(scanned >= 2);
        assert_eq!(files.len(), 2);
        assert!(files.iter().any(|file| file.category == ProjectFileCategory::Mix));
        assert!(files.iter().any(|file| file.category == ProjectFileCategory::Stem));
        assert!(files.iter().all(|file| !file.relative_path.contains("Backup")));
    }

    #[test]
    fn recognizes_optional_fl_audio_and_samples_folders() {
        let root = Path::new("C:/Music/get dark");
        let folders = default_folders(root, "FL Studio");
        assert!(folders.iter().any(|folder| folder.path.ends_with("Audio")));
        assert!(folders.iter().any(|folder| folder.path.ends_with("Samples")));
        assert!(folders.iter().all(|folder| !folder.path.ends_with("Backup") && !folder.path.ends_with("Backups")));
    }
}

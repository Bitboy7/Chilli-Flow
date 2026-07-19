use std::path::{Path, PathBuf};

use crate::{
    errors::{AppError, AppResult},
    models::{ProjectFile, ProjectFileCategory},
    platform,
    repositories::{NewProjectFile, ProjectFileRepository},
    state::AppState,
};

pub struct ProjectFileService;

struct PreparedFile {
    path: String,
    name: String,
    file_type: String,
    size: i64,
}

impl ProjectFileService {
    pub fn list(state: &AppState, project_id: i64) -> AppResult<Vec<ProjectFile>> {
        let connection = state.database().connection()?;
        ProjectFileRepository::list(&connection, project_id)
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

fn prepare_file(path: &Path) -> AppResult<PreparedFile> {
    let path = dunce::canonicalize(path).map_err(AppError::FileOperation)?;
    let metadata = path.metadata().map_err(AppError::FileOperation)?;
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
}

use crate::{
    errors::{AppError, AppResult},
    models::WatchedFolder,
    platform::canonicalize_directory,
    repositories::WatchedFolderRepository,
    state::AppState,
};

pub struct FolderService;

impl FolderService {
    pub fn list(state: &AppState) -> AppResult<Vec<WatchedFolder>> {
        let connection = state.database().connection()?;
        WatchedFolderRepository::list(&connection)
    }

    pub fn add(state: &AppState, raw_path: &str) -> AppResult<WatchedFolder> {
        let canonical = canonicalize_directory(raw_path)?;
        let folder_path = canonical
            .to_str()
            .ok_or_else(|| AppError::InvalidPath("La ruta no es texto UTF-8 válido".to_string()))?;
        let connection = state.database().connection()?;

        if WatchedFolderRepository::exists(&connection, folder_path)? {
            return Err(AppError::WatchedFolderAlreadyExists);
        }

        WatchedFolderRepository::insert(&connection, folder_path)
    }

    pub fn set_enabled(state: &AppState, folder_id: i64, enabled: bool) -> AppResult<()> {
        let connection = state.database().connection()?;
        WatchedFolderRepository::set_enabled(&connection, folder_id, enabled)
    }

    pub fn remove(state: &AppState, folder_id: i64) -> AppResult<()> {
        let connection = state.database().connection()?;
        WatchedFolderRepository::remove(&connection, folder_id)
    }
}

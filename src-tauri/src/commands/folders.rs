use tauri::State;

use crate::{
    models::WatchedFolder,
    services::FolderService,
    state::AppState,
};

#[tauri::command]
pub fn list_watched_folders(
    state: State<'_, AppState>,
) -> Result<Vec<WatchedFolder>, String> {
    FolderService::list(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn add_watched_folder(
    state: State<'_, AppState>,
    folder_path: String,
) -> Result<WatchedFolder, String> {
    FolderService::add(&state, &folder_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_watched_folder_enabled(
    state: State<'_, AppState>,
    folder_id: i64,
    enabled: bool,
) -> Result<(), String> {
    FolderService::set_enabled(&state, folder_id, enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_watched_folder(
    state: State<'_, AppState>,
    folder_id: i64,
) -> Result<(), String> {
    FolderService::remove(&state, folder_id).map_err(|error| error.to_string())
}

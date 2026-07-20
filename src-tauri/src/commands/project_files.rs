use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::{
    models::{ProjectFile, ProjectFileCategory, SyncProjectFilesResult},
    services::ProjectFileService,
    state::AppState,
};

#[tauri::command]
pub fn list_project_files(state: State<'_, AppState>, project_id: i64) -> Result<Vec<ProjectFile>, String> {
    ProjectFileService::list(&state, project_id).map_err(|error| error.to_string())
}


#[tauri::command]
pub fn sync_project_files(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<SyncProjectFilesResult, String> {
    ProjectFileService::sync(&state, project_id).map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn select_project_files(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
    category: ProjectFileCategory,
) -> Result<Vec<ProjectFile>, String> {
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_files()
    }).await.map_err(|error| format!("No se pudo abrir el selector: {error}"))?;
    let Some(selected) = selected else {
        return ProjectFileService::list(&state, project_id).map_err(|error| error.to_string());
    };
    let paths = selected.into_iter().map(|path| path.into_path().map_err(|error| error.to_string()))
        .collect::<Result<Vec<_>, _>>()?;
    ProjectFileService::add(&state, project_id, category, paths).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_project_file(
    state: State<'_, AppState>, project_id: i64, file_id: i64,
) -> Result<(), String> {
    ProjectFileService::remove(&state, project_id, file_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_project_file_category(
    state: State<'_, AppState>,
    project_id: i64,
    file_id: i64,
    category: ProjectFileCategory,
) -> Result<Vec<ProjectFile>, String> {
    ProjectFileService::set_category(&state, project_id, file_id, category)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_project_file(
    state: State<'_, AppState>, project_id: i64, file_id: i64,
) -> Result<(), String> {
    ProjectFileService::open(&state, project_id, file_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_project_preview(
    state: State<'_, AppState>, project_id: i64, file_id: Option<i64>,
) -> Result<(), String> {
    ProjectFileService::set_preview(&state, project_id, file_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn authorize_project_audio(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
    file_id: i64,
) -> Result<String, String> {
    let path = ProjectFileService::audio_path(&state, project_id, file_id)
        .map_err(|error| error.to_string())?;
    app.asset_protocol_scope().allow_file(&path).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

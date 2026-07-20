use tauri::State;

use crate::{
    models::ProjectVersionSet,
    services::ProjectVersionService,
    state::AppState,
};

#[tauri::command]
pub fn list_project_versions(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<ProjectVersionSet, String> {
    ProjectVersionService::list(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn confirm_project_version(
    state: State<'_, AppState>,
    project_id: i64,
    version_id: i64,
) -> Result<ProjectVersionSet, String> {
    ProjectVersionService::confirm(&state, project_id, version_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn detach_project_version(
    state: State<'_, AppState>,
    project_id: i64,
    version_id: i64,
) -> Result<ProjectVersionSet, String> {
    ProjectVersionService::detach(&state, project_id, version_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn promote_project_version(
    state: State<'_, AppState>,
    project_id: i64,
    version_id: i64,
) -> Result<ProjectVersionSet, String> {
    ProjectVersionService::promote(&state, project_id, version_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_project_version(
    state: State<'_, AppState>,
    project_id: i64,
    version_id: i64,
) -> Result<(), String> {
    ProjectVersionService::open(&state, project_id, version_id, false)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reveal_project_version(
    state: State<'_, AppState>,
    project_id: i64,
    version_id: i64,
) -> Result<(), String> {
    ProjectVersionService::open(&state, project_id, version_id, true)
        .map_err(|error| error.to_string())
}

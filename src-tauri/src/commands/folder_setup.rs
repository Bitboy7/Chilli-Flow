use tauri::State;

use crate::{
    models::{FolderSetupPlan, ProjectDetail},
    services::FolderSetupService,
    state::AppState,
};

#[tauri::command]
pub fn preview_project_folder_setup(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<FolderSetupPlan, String> {
    FolderSetupService::preview(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn apply_project_folder_setup(
    state: State<'_, AppState>,
    project_id: i64,
    token: u64,
) -> Result<ProjectDetail, String> {
    FolderSetupService::apply(&state, project_id, token).map_err(|error| error.to_string())
}

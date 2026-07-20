use tauri::State;

use crate::{
    models::{FinishDashboard, FinishProjectPlan, UpdateFinishPlanInput},
    services::FinishModeService,
    state::AppState,
};

#[tauri::command]
pub fn get_finish_dashboard(state: State<'_, AppState>) -> Result<FinishDashboard, String> {
    FinishModeService::dashboard(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_project_finish_plan(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<FinishProjectPlan, String> {
    FinishModeService::get(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_project_finish_plan(
    state: State<'_, AppState>,
    project_id: i64,
    input: UpdateFinishPlanInput,
) -> Result<FinishProjectPlan, String> {
    FinishModeService::update(&state, project_id, input).map_err(|error| error.to_string())
}

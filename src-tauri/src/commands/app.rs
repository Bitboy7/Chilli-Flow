use tauri::State;

use crate::{models::AppStatus, services::AppService, state::AppState};

#[tauri::command]
pub fn get_app_status(state: State<'_, AppState>) -> Result<AppStatus, String> {
    AppService::status(&state).map_err(|error| error.to_string())
}

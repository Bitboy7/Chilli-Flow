use tauri::{AppHandle, State};

use crate::{
    models::ScanSession,
    services::ScanService,
    state::AppState,
};

#[tauri::command]
pub fn start_scan(
    app: AppHandle,
    state: State<'_, AppState>,
    folder_id: Option<i64>,
) -> Result<ScanSession, String> {
    ScanService::start(&app, &state, folder_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn cancel_scan(
    state: State<'_, AppState>,
    session_id: u64,
) -> Result<(), String> {
    ScanService::cancel(&state, session_id).map_err(|error| error.to_string())
}

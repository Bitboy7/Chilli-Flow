use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::{
    models::{CreateHandoffInput, HandoffExportResult, HandoffPreview},
    services::HandoffService,
    state::AppState,
};

#[tauri::command]
pub fn get_handoff_preview(
    state: tauri::State<'_, AppState>,
    project_id: i64,
) -> Result<HandoffPreview, String> {
    HandoffService::preview(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn select_handoff_destination(app: AppHandle) -> Result<Option<String>, String> {
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder()
    })
    .await
    .map_err(|error| format!("No se pudo abrir el selector: {error}"))?;
    selected
        .map(|path| path.into_path().map(|value| value.to_string_lossy().into_owned()))
        .transpose()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_handoff(
    app: AppHandle,
    project_id: i64,
    input: CreateHandoffInput,
) -> Result<HandoffExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        HandoffService::export(&state, project_id, input)
    })
    .await
    .map_err(|error| format!("La exportación se interrumpió: {error}"))?
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_handoff_destination(
    state: tauri::State<'_, AppState>,
    project_id: i64,
    path: String,
) -> Result<(), String> {
    HandoffService::open_destination(&state, project_id, &path)
        .map_err(|error| error.to_string())
}

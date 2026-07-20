use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::{
    models::{CreateWorkspaceInput, DawInstallation, ProjectDetail},
    scanner::normalize_extension,
    services::WorkspaceService,
    state::AppState,
};

#[tauri::command]
pub async fn list_daw_installations() -> Result<Vec<DawInstallation>, String> {
    tauri::async_runtime::spawn_blocking(WorkspaceService::installations)
        .await
        .map_err(|error| format!("No se pudo detectar los DAWs instalados: {error}"))
}

#[tauri::command]
pub async fn select_workspace_parent(app: AppHandle) -> Result<Option<String>, String> {
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
pub async fn select_workspace_template(
    app: AppHandle,
    extension: String,
) -> Result<Option<String>, String> {
    let extension = normalize_extension(&extension)
        .ok_or_else(|| "La extensión del DAW no es válida".to_string())?;
    let filter = extension.trim_start_matches('.').to_string();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Plantilla del proyecto", &[filter.as_str()])
            .blocking_pick_file()
    })
    .await
    .map_err(|error| format!("No se pudo abrir el selector: {error}"))?;
    selected
        .map(|path| path.into_path().map(|value| value.to_string_lossy().into_owned()))
        .transpose()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    input: CreateWorkspaceInput,
) -> Result<ProjectDetail, String> {
    WorkspaceService::create(&state, input).map_err(|error| error.to_string())
}

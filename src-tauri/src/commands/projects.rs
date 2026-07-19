use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::{
    models::{CoverAsset, ProjectDetail, ProjectFolderCategory, UpdateProjectInput},
    services::ProjectDetailService,
    state::AppState,
};

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, project_id: i64) -> Result<ProjectDetail, String> {
    ProjectDetailService::get(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    project_id: i64,
    input: UpdateProjectInput,
) -> Result<ProjectDetail, String> {
    ProjectDetailService::update(&state, project_id, input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_project_favorite(
    state: State<'_, AppState>,
    project_id: i64,
    favorite: bool,
) -> Result<(), String> {
    ProjectDetailService::set_favorite(&state, project_id, favorite)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn select_project_cover(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<ProjectDetail, String> {
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Images", &["png", "jpg", "jpeg", "webp", "gif"])
            .blocking_pick_file()
    })
    .await
    .map_err(|error| format!("No se pudo abrir el selector: {error}"))?;
    let Some(selected) = selected else {
        return ProjectDetailService::get(&state, project_id).map_err(|error| error.to_string());
    };
    let selected = selected.into_path().map_err(|error| error.to_string())?;
    ProjectDetailService::set_cover(&state, project_id, &selected)
        .and_then(|_| ProjectDetailService::get(&state, project_id))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_project_cover(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<ProjectDetail, String> {
    ProjectDetailService::clear_cover(&state, project_id)
        .and_then(|_| ProjectDetailService::get(&state, project_id))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_project_cover(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<Option<CoverAsset>, String> {
    ProjectDetailService::cover_asset(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn rename_project_file(
    state: State<'_, AppState>,
    project_id: i64,
    new_stem: String,
) -> Result<ProjectDetail, String> {
    ProjectDetailService::rename_physical_file(&state, project_id, &new_stem)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_project(state: State<'_, AppState>, project_id: i64) -> Result<(), String> {
    ProjectDetailService::open_project(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_project_folder(state: State<'_, AppState>, project_id: i64) -> Result<(), String> {
    ProjectDetailService::open_project_folder(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reveal_project(state: State<'_, AppState>, project_id: i64) -> Result<(), String> {
    ProjectDetailService::reveal_project(&state, project_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn select_project_asset_folder(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
    category: ProjectFolderCategory,
) -> Result<ProjectDetail, String> {
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder()
    }).await.map_err(|error| format!("No se pudo abrir el selector: {error}"))?;
    let Some(selected) = selected else {
        return ProjectDetailService::get(&state, project_id).map_err(|error| error.to_string());
    };
    let selected = selected.into_path().map_err(|error| error.to_string())?;
    ProjectDetailService::set_project_folder(&state, project_id, category, &selected)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_project_asset_folder(
    state: State<'_, AppState>,
    project_id: i64,
    category: ProjectFolderCategory,
) -> Result<ProjectDetail, String> {
    ProjectDetailService::clear_project_folder(&state, project_id, category)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_project_asset_folder(
    state: State<'_, AppState>,
    project_id: i64,
    category: ProjectFolderCategory,
) -> Result<(), String> {
    ProjectDetailService::open_project_asset_folder(&state, project_id, category)
        .map_err(|error| error.to_string())
}

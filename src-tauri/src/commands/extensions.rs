use tauri::State;

use crate::{
    models::{CustomExtension, ExtensionCatalogItem},
    services::ExtensionService,
    state::AppState,
};

#[tauri::command]
pub fn get_extension_catalog(
    state: State<'_, AppState>,
) -> Result<Vec<ExtensionCatalogItem>, String> {
    ExtensionService::catalog(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn add_custom_extension(
    state: State<'_, AppState>,
    extension: String,
    daw_name: String,
) -> Result<CustomExtension, String> {
    ExtensionService::add(&state, &extension, &daw_name)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_custom_extension_enabled(
    state: State<'_, AppState>,
    custom_extension_id: i64,
    enabled: bool,
) -> Result<(), String> {
    ExtensionService::set_enabled(&state, custom_extension_id, enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_custom_extension(
    state: State<'_, AppState>,
    custom_extension_id: i64,
) -> Result<(), String> {
    ExtensionService::remove(&state, custom_extension_id)
        .map_err(|error| error.to_string())
}

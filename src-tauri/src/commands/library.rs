use tauri::State;

use crate::{
    models::{ProjectFacets, ProjectPage, ProjectQuery},
    services::LibraryService,
    state::AppState,
};

#[tauri::command]
pub fn list_projects(
    state: State<'_, AppState>,
    query: ProjectQuery,
) -> Result<ProjectPage, String> {
    LibraryService::page(&state, query).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_project_facets(
    state: State<'_, AppState>,
) -> Result<ProjectFacets, String> {
    LibraryService::facets(&state).map_err(|error| error.to_string())
}

use tauri::State;

use crate::{
    models::AudioAnalysis,
    services::AudioAnalysisService,
    state::AppState,
};

#[tauri::command]
pub async fn analyze_project_audio(
    state: State<'_, AppState>,
    project_id: i64,
    file_id: i64,
) -> Result<AudioAnalysis, String> {
    AudioAnalysisService::analyze(&state, project_id, file_id)
        .await
        .map_err(|error| error.to_string())
}

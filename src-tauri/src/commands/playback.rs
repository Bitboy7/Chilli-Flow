use tauri::State;

use crate::{
    models::{PlaybackSession, PlaybackSessionInput},
    services::PlaybackService,
    state::AppState,
};

#[tauri::command]
pub fn get_playback_session(state: State<'_, AppState>) -> Result<PlaybackSession, String> {
    PlaybackService::load(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_playback_session(
    state: State<'_, AppState>,
    input: PlaybackSessionInput,
) -> Result<(), String> {
    PlaybackService::save(&state, input).map_err(|error| error.to_string())
}

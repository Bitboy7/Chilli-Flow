use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackTrackRef {
    pub project_id: i64,
    pub file_id: i64,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    #[default]
    Off,
    All,
    One,
}

impl Default for RepeatMode {
    fn default() -> Self {
        Self::Off
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSessionInput {
    pub queue: Vec<PlaybackTrackRef>,
    pub current_index: Option<usize>,
    pub position_seconds: f64,
    pub volume: f64,
    pub repeat_mode: RepeatMode,
    pub shuffle: bool,
}

impl Default for PlaybackSessionInput {
    fn default() -> Self {
        Self {
            queue: Vec::new(),
            current_index: None,
            position_seconds: 0.0,
            volume: 0.8,
            repeat_mode: RepeatMode::Off,
            shuffle: false,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayableTrack {
    pub project_id: i64,
    pub file_id: i64,
    pub project_name: String,
    pub file_name: String,
    pub file_type: String,
    pub category: String,
    pub is_missing: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSession {
    pub queue: Vec<PlayableTrack>,
    pub current_index: Option<usize>,
    pub position_seconds: f64,
    pub volume: f64,
    pub repeat_mode: RepeatMode,
    pub shuffle: bool,
}

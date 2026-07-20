use serde::{Deserialize, Serialize};

use super::ProjectFile;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffSettings {
    pub daw_version: Option<String>,
    pub time_signature: String,
    pub common_start: String,
    pub collaborator_notes: Option<String>,
    pub plugins: Vec<String>,
}

impl Default for HandoffSettings {
    fn default() -> Self {
        Self {
            daw_version: None,
            time_signature: "4/4".into(),
            common_start: "00:00:00.000".into(),
            collaborator_notes: None,
            plugins: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffFileSelection {
    pub file_id: i64,
    pub variant: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateHandoffInput {
    pub settings: HandoffSettings,
    pub selections: Vec<HandoffFileSelection>,
    pub include_project_file: bool,
    pub destination_parent: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffPreview {
    pub settings: HandoffSettings,
    pub files: Vec<ProjectFile>,
    pub warnings: Vec<String>,
    pub next_version: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffExportResult {
    pub destination_path: String,
    pub version_number: i64,
    pub file_count: i64,
}

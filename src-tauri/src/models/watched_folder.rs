use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedFolder {
    pub id: i64,
    pub folder_path: String,
    pub is_enabled: bool,
    pub last_scanned_at: Option<String>,
    pub created_at: String,
}

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSession {
    pub session_id: u64,
    pub folder_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub session_id: u64,
    pub folder_id: i64,
    pub folder_path: String,
    pub files_scanned: u64,
    pub projects_found: u64,
    pub unreadable_entries: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanFinished {
    pub session_id: u64,
    pub status: String,
    pub files_scanned: u64,
    pub projects_found: u64,
    pub projects_created: u64,
    pub projects_updated: u64,
    pub projects_marked_missing: u64,
    pub error_message: Option<String>,
}

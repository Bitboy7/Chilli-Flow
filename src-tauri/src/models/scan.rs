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
    pub projects_moved: u64,
    pub projects_marked_missing: u64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanHistoryEntry {
    pub id: i64,
    pub folder_path: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub files_scanned: i64,
    pub projects_found: i64,
    pub projects_created: i64,
    pub projects_updated: i64,
    pub projects_moved: i64,
    pub projects_marked_missing: i64,
    pub unreadable_entries: i64,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanHistoryPage {
    pub items: Vec<ScanHistoryEntry>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

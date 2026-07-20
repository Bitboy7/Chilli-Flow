use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectVersionItem {
    pub id: i64,
    pub file_name: String,
    pub file_path: String,
    pub kind: String,
    pub confidence: Option<String>,
    pub file_size: i64,
    pub file_modified_at: Option<String>,
    pub is_missing: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectVersionSet {
    pub project_id: i64,
    pub primary: ProjectVersionItem,
    pub versions: Vec<ProjectVersionItem>,
}

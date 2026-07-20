use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderSetupItem {
    pub category: String,
    pub path: String,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderSetupPlan {
    pub token: u64,
    pub project_id: i64,
    pub daw: String,
    pub root_path: String,
    pub items: Vec<FolderSetupItem>,
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FolderSetupMethod {
    Copy,
    Move,
    FoldersOnly,
}

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
    pub method: FolderSetupMethod,
    pub source_path: String,
    pub target_project_path: String,
    pub will_relocate_project: bool,
    pub root_exists: bool,
    pub root_path: String,
    pub items: Vec<FolderSetupItem>,
}

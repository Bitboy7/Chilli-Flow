use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DawInstallation {
    pub daw: String,
    pub extension: String,
    pub installed: bool,
    pub executable_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub daw: String,
    pub extension: String,
    pub parent_directory: String,
    pub template_path: Option<String>,
}

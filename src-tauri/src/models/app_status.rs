use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub app_name: String,
    pub app_version: String,
    pub database_ready: bool,
    pub schema_version: i64,
    pub project_count: i64,
    pub watched_folder_count: i64,
}

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomExtension {
    pub id: i64,
    pub extension: String,
    pub daw_name: String,
    pub is_enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionCatalogItem {
    pub extension: String,
    pub daw_name: String,
    pub is_custom: bool,
    pub custom_extension_id: Option<i64>,
    pub is_enabled: bool,
}

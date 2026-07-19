#[derive(Debug, Clone)]
pub struct DiscoveredProject {
    pub display_name: String,
    pub original_name: String,
    pub file_path: String,
    pub extension: String,
    pub daw: String,
    pub file_size: u64,
    pub file_created_at: Option<f64>,
    pub file_modified_at: Option<f64>,
}

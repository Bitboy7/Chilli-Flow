use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectSort {
    Name,
    Modified,
    Created,
    Bpm,
    Imported,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectQuery {
    pub page: u32,
    pub page_size: u32,
    pub search: Option<String>,
    pub daw: Option<String>,
    pub extension: Option<String>,
    pub status: Option<String>,
    pub genre: Option<String>,
    pub tag_id: Option<i64>,
    pub favorite_only: bool,
    pub sort_by: ProjectSort,
    pub sort_direction: SortDirection,
}

impl Default for ProjectQuery {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 24,
            search: None,
            daw: None,
            extension: None,
            status: None,
            genre: None,
            tag_id: None,
            favorite_only: false,
            sort_by: ProjectSort::Modified,
            sort_direction: SortDirection::Desc,
        }
    }
}

impl ProjectQuery {
    pub fn normalize(mut self) -> Self {
        self.page = self.page.max(1);
        self.page_size = self.page_size.clamp(1, 100);
        self.search = normalize_text(self.search, 200);
        self.daw = normalize_text(self.daw, 100);
        self.extension = normalize_text(self.extension, 20);
        self.status = normalize_text(self.status, 100);
        self.genre = normalize_text(self.genre, 100);
        self
    }
}

fn normalize_text(value: Option<String>, maximum_length: usize) -> Option<String> {
    let value = value?.trim().chars().take(maximum_length).collect::<String>();
    (!value.is_empty()).then_some(value)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectListItem {
    pub id: i64,
    pub display_name: String,
    pub original_name: String,
    pub file_path: String,
    pub extension: String,
    pub daw: String,
    pub cover_path: Option<String>,
    pub bpm: Option<f64>,
    pub musical_key: Option<String>,
    pub genre: Option<String>,
    pub status: String,
    pub status_label: String,
    pub status_color: Option<String>,
    pub rating: Option<i64>,
    pub is_favorite: bool,
    pub file_created_at: Option<String>,
    pub file_modified_at: Option<String>,
    pub indexed_at: String,
    pub is_missing: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPage {
    pub items: Vec<ProjectListItem>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectStatusFacet {
    pub key: String,
    pub label: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTagFacet {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFacets {
    pub daws: Vec<String>,
    pub extensions: Vec<String>,
    pub statuses: Vec<ProjectStatusFacet>,
    pub genres: Vec<String>,
    pub tags: Vec<ProjectTagFacet>,
}

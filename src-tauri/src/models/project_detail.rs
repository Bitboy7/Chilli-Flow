use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetail {
    pub id: i64,
    pub display_name: String,
    pub original_name: String,
    pub file_path: String,
    pub extension: String,
    pub daw: String,
    pub cover_path: Option<String>,
    pub preview_path: Option<String>,
    pub bpm: Option<f64>,
    pub musical_key: Option<String>,
    pub genre: Option<String>,
    pub status: String,
    pub status_label: String,
    pub status_color: Option<String>,
    pub rating: Option<i64>,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub file_size: i64,
    pub file_created_at: Option<String>,
    pub file_modified_at: Option<String>,
    pub indexed_at: String,
    pub updated_at: String,
    pub is_missing: bool,
    pub workspace_root: Option<String>,
    pub source_kind: String,
    pub tags: Vec<String>,
    pub folders: ProjectFolderPaths,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFolderPaths {
    pub stems: Option<String>,
    pub mixes: Option<String>,
    pub masters: Option<String>,
    pub references: Option<String>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectFolderCategory {
    Stems,
    Mixes,
    Masters,
    References,
}

impl ProjectFolderCategory {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stems => "stems",
            Self::Mixes => "mixes",
            Self::Masters => "masters",
            Self::References => "references",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub display_name: String,
    pub bpm: Option<f64>,
    pub musical_key: Option<String>,
    pub genre: Option<String>,
    pub status: String,
    pub rating: Option<i64>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverAsset {
    pub data_url: String,
}

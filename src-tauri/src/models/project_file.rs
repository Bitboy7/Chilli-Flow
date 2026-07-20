use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectFileCategory {
    Stem,
    Mix,
    Master,
    Preview,
    Reference,
    Artwork,
    Midi,
    Preset,
    Sample,
    Other,
}

impl ProjectFileCategory {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stem => "stem",
            Self::Mix => "mix",
            Self::Master => "master",
            Self::Preview => "preview",
            Self::Reference => "reference",
            Self::Artwork => "artwork",
            Self::Midi => "midi",
            Self::Preset => "preset",
            Self::Sample => "sample",
            Self::Other => "other",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub id: i64,
    pub project_id: i64,
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub category: String,
    pub file_size: i64,
    pub created_at: String,
    pub is_missing: bool,
    pub origin: String,
    pub source_label: Option<String>,
    pub relative_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProjectFilesResult {
    pub files: Vec<ProjectFile>,
    pub discovered_count: usize,
    pub scanned_folders: usize,
}

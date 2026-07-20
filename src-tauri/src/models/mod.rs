mod audio_analysis;
mod app_status;
mod custom_extension;
mod folder_setup;
mod project;
mod project_detail;
mod project_file;
mod project_query;
mod playback;
mod scan;
mod watched_folder;

pub use app_status::AppStatus;
pub use custom_extension::{CustomExtension, ExtensionCatalogItem};
pub use folder_setup::{FolderSetupItem, FolderSetupPlan};
pub use project::DiscoveredProject;
pub use project_detail::{CoverAsset, ProjectDetail, ProjectFolderCategory, ProjectFolderPaths, UpdateProjectInput};
pub use project_file::{ProjectFile, ProjectFileCategory};
pub use project_query::{
    ProjectFacets, ProjectListItem, ProjectPage, ProjectQuery, ProjectSort,
    ProjectStatusFacet, ProjectTagFacet, SortDirection,
};
pub use playback::{
    PlayableTrack, PlaybackSession, PlaybackSessionInput, PlaybackTrackRef,
};
pub use scan::{ScanFinished, ScanHistoryEntry, ScanHistoryPage, ScanProgress, ScanSession};
pub use watched_folder::WatchedFolder;
pub use audio_analysis::{AudioAnalysis, CachedAudioAnalysis};

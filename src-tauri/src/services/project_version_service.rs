use std::path::Path;

use crate::{
    errors::{AppError, AppResult},
    models::ProjectVersionSet,
    platform,
    repositories::{ProjectDetailRepository, ProjectVersionRepository},
    state::AppState,
};

use super::project_detail_service::authorize_project_path;

pub struct ProjectVersionService;

impl ProjectVersionService {
    pub fn list(state: &AppState, project_id: i64) -> AppResult<ProjectVersionSet> {
        let connection = state.database().connection()?;
        ProjectVersionRepository::list(&connection, project_id)
    }

    pub fn confirm(state: &AppState, project_id: i64, version_id: i64) -> AppResult<ProjectVersionSet> {
        let connection = state.database().connection()?;
        ProjectVersionRepository::confirm(&connection, project_id, version_id)?;
        ProjectVersionRepository::list(&connection, project_id)
    }

    pub fn detach(state: &AppState, project_id: i64, version_id: i64) -> AppResult<ProjectVersionSet> {
        let connection = state.database().connection()?;
        ProjectVersionRepository::detach(&connection, project_id, version_id)?;
        ProjectVersionRepository::list(&connection, project_id)
    }

    pub fn promote(state: &AppState, project_id: i64, version_id: i64) -> AppResult<ProjectVersionSet> {
        let mut connection = state.database().connection()?;
        ProjectVersionRepository::promote(&mut connection, project_id, version_id)?;
        ProjectVersionRepository::list(&connection, project_id)
    }

    pub fn open(state: &AppState, project_id: i64, version_id: i64, reveal: bool) -> AppResult<()> {
        let connection = state.database().connection()?;
        let path = ProjectVersionRepository::version_path(&connection, project_id, version_id)?;
        let watched_paths = ProjectDetailRepository::watched_paths(&connection)?;
        drop(connection);
        let canonical = dunce::canonicalize(Path::new(&path)).map_err(AppError::FileOperation)?;
        authorize_project_path(&canonical, &watched_paths)?;
        if reveal {
            platform::reveal_path(&canonical)
        } else {
            platform::open_path(&canonical)
        }
    }
}

use crate::{
    errors::AppResult,
    models::{ProjectFacets, ProjectPage, ProjectQuery},
    repositories::ProjectQueryRepository,
    state::AppState,
};

pub struct LibraryService;

impl LibraryService {
    pub fn page(state: &AppState, query: ProjectQuery) -> AppResult<ProjectPage> {
        let connection = state.database().connection()?;
        ProjectQueryRepository::page(&connection, query)
    }

    pub fn facets(state: &AppState) -> AppResult<ProjectFacets> {
        let connection = state.database().connection()?;
        ProjectQueryRepository::facets(&connection)
    }
}

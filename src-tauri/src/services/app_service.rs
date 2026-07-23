use crate::{
    errors::AppResult, models::AppStatus, repositories::LibraryRepository, state::AppState,
};

pub struct AppService;

impl AppService {
    pub fn status(state: &AppState) -> AppResult<AppStatus> {
        let connection = state.database().connection()?;
        let stats = LibraryRepository::stats(&connection)?;

        Ok(AppStatus {
            app_name: "Chilli Flow".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            database_ready: state.database().path().exists(),
            schema_version: stats.schema_version,
            project_count: stats.project_count,
            watched_folder_count: stats.watched_folder_count,
        })
    }
}

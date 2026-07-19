use rusqlite::Connection;

use crate::errors::AppResult;

#[derive(Debug)]
pub struct LibraryStats {
    pub schema_version: i64,
    pub project_count: i64,
    pub watched_folder_count: i64,
}

pub struct LibraryRepository;

impl LibraryRepository {
    pub fn stats(connection: &Connection) -> AppResult<LibraryStats> {
        let schema_version = connection.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )?;
        let project_count = connection.query_row(
            "SELECT COUNT(*) FROM projects WHERE is_missing = 0",
            [],
            |row| row.get(0),
        )?;
        let watched_folder_count = connection.query_row(
            "SELECT COUNT(*) FROM watched_folders WHERE is_enabled = 1",
            [],
            |row| row.get(0),
        )?;

        Ok(LibraryStats {
            schema_version,
            project_count,
            watched_folder_count,
        })
    }
}

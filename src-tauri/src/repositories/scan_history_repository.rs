use rusqlite::{params, Connection};

use crate::errors::AppResult;

pub struct ScanHistoryRepository;

impl ScanHistoryRepository {
    pub fn start(connection: &Connection, folder_path: &str) -> AppResult<i64> {
        connection.execute(
            "INSERT INTO scan_history (folder_path, started_at, status)
             VALUES (?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'running')",
            params![folder_path],
        )?;
        Ok(connection.last_insert_rowid())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn finish(
        connection: &Connection,
        scan_history_id: i64,
        status: &str,
        files_scanned: u64,
        projects_found: u64,
        projects_created: u64,
        projects_updated: u64,
        error_message: Option<&str>,
    ) -> AppResult<()> {
        connection.execute(
            "UPDATE scan_history
             SET finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                 files_scanned = ?1,
                 projects_found = ?2,
                 projects_created = ?3,
                 projects_updated = ?4,
                 status = ?5,
                 error_message = ?6
             WHERE id = ?7",
            params![
                as_i64(files_scanned),
                as_i64(projects_found),
                as_i64(projects_created),
                as_i64(projects_updated),
                status,
                error_message,
                scan_history_id
            ],
        )?;
        Ok(())
    }
}

fn as_i64(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

pub(crate) mod migrations;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
    time::Duration,
};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::errors::{AppError, AppResult};

const DATABASE_FILE_NAME: &str = "chilli-beat.sqlite3";

pub struct Database {
    connection: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    pub fn initialize(app: &AppHandle) -> AppResult<Self> {
        let data_directory = app
            .path()
            .app_data_dir()
            .map_err(AppError::AppDataDirectory)?;
        fs::create_dir_all(&data_directory).map_err(AppError::CreateDataDirectory)?;

        Self::open(data_directory.join(DATABASE_FILE_NAME))
    }

    fn open(path: PathBuf) -> AppResult<Self> {
        let mut connection = Connection::open(&path)?;
        configure_connection(&connection)?;
        migrations::run(&mut connection)?;
        recover_interrupted_scans(&connection)?;

        Ok(Self {
            connection: Mutex::new(connection),
            path,
        })
    }

    pub fn connection(&self) -> AppResult<MutexGuard<'_, Connection>> {
        self.connection.lock().map_err(|_| AppError::DatabaseLock)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

fn recover_interrupted_scans(connection: &Connection) -> AppResult<()> {
    connection.execute(
        "UPDATE scan_history
         SET status = 'failed',
             finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             error_message = COALESCE(error_message, 'La aplicación se cerró antes de terminar el escaneo')
         WHERE status = 'running'",
        [],
    )?;
    Ok(())
}

pub(crate) fn configure_connection(connection: &Connection) -> AppResult<()> {
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_schema_and_seed_statuses() {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        configure_connection(&connection).expect("configure connection");
        migrations::run(&mut connection).expect("run migrations");

        let schema_version: i64 = connection
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| row.get(0))
            .expect("schema version");
        let statuses: i64 = connection
            .query_row("SELECT COUNT(*) FROM project_statuses", [], |row| row.get(0))
            .expect("status count");

        assert_eq!(schema_version, 10);
        assert_eq!(statuses, 8);
    }

    #[test]
    fn rejects_duplicate_project_paths() {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        configure_connection(&connection).expect("configure connection");
        migrations::run(&mut connection).expect("run migrations");

        let insert = || {
            connection.execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw)
                 VALUES ('Demo', 'demo.flp', 'C:/Music/demo.flp', '.flp', 'FL Studio')",
                [],
            )
        };

        assert_eq!(insert().expect("first project"), 1);
        assert!(insert().is_err());
    }

    #[test]
    fn recovers_scan_rows_left_running_by_an_interrupted_process() {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        configure_connection(&connection).expect("configure connection");
        migrations::run(&mut connection).expect("run migrations");
        connection
            .execute(
                "INSERT INTO scan_history (folder_path, started_at, status)
                 VALUES ('C:/Music', '2026-07-19T00:00:00Z', 'running')",
                [],
            )
            .expect("running scan");

        recover_interrupted_scans(&connection).expect("recover scans");

        let (status, finished_at, message): (String, Option<String>, Option<String>) = connection
            .query_row(
                "SELECT status, finished_at, error_message FROM scan_history",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("recovered scan");
        assert_eq!(status, "failed");
        assert!(finished_at.is_some());
        assert!(message.is_some());
    }
}

use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::{AppError, AppResult},
    models::WatchedFolder,
};

pub struct WatchedFolderRepository;

impl WatchedFolderRepository {
    pub fn list(connection: &Connection) -> AppResult<Vec<WatchedFolder>> {
        let mut statement = connection.prepare(
            "SELECT id, folder_path, is_enabled, last_scanned_at, created_at
             FROM watched_folders
             ORDER BY folder_path COLLATE NOCASE",
        )?;
        let folders = statement
            .query_map([], map_folder)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(folders)
    }

    pub fn scan_targets(
        connection: &Connection,
        folder_id: Option<i64>,
    ) -> AppResult<Vec<WatchedFolder>> {
        if let Some(folder_id) = folder_id {
            let folder = connection
                .query_row(
                    "SELECT id, folder_path, is_enabled, last_scanned_at, created_at
                     FROM watched_folders
                     WHERE id = ?1 AND is_enabled = 1",
                    params![folder_id],
                    map_folder,
                )
                .optional()?;

            return folder.map(|folder| vec![folder]).ok_or(AppError::WatchedFolderNotFound);
        }

        let mut statement = connection.prepare(
            "SELECT id, folder_path, is_enabled, last_scanned_at, created_at
             FROM watched_folders
             WHERE is_enabled = 1
             ORDER BY folder_path COLLATE NOCASE",
        )?;
        let folders = statement
            .query_map([], map_folder)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(folders)
    }

    pub fn exists(connection: &Connection, folder_path: &str) -> AppResult<bool> {
        Ok(connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM watched_folders WHERE folder_path = ?1)",
            params![folder_path],
            |row| row.get(0),
        )?)
    }

    pub fn insert(connection: &Connection, folder_path: &str) -> AppResult<WatchedFolder> {
        connection.execute(
            "INSERT INTO watched_folders (folder_path) VALUES (?1)",
            params![folder_path],
        )?;
        let id = connection.last_insert_rowid();
        Ok(connection.query_row(
            "SELECT id, folder_path, is_enabled, last_scanned_at, created_at
             FROM watched_folders WHERE id = ?1",
            params![id],
            map_folder,
        )?)
    }

    pub fn set_enabled(connection: &Connection, folder_id: i64, enabled: bool) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE watched_folders SET is_enabled = ?1 WHERE id = ?2",
            params![enabled, folder_id],
        )?;
        if changed == 0 {
            return Err(AppError::WatchedFolderNotFound);
        }
        Ok(())
    }

    pub fn remove(connection: &Connection, folder_id: i64) -> AppResult<()> {
        let changed = connection.execute(
            "DELETE FROM watched_folders WHERE id = ?1",
            params![folder_id],
        )?;
        if changed == 0 {
            return Err(AppError::WatchedFolderNotFound);
        }
        Ok(())
    }

    pub fn touch_scanned(connection: &Connection, folder_id: i64) -> AppResult<()> {
        connection.execute(
            "UPDATE watched_folders
             SET last_scanned_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1",
            params![folder_id],
        )?;
        Ok(())
    }
}

fn map_folder(row: &rusqlite::Row<'_>) -> rusqlite::Result<WatchedFolder> {
    Ok(WatchedFolder {
        id: row.get(0)?,
        folder_path: row.get(1)?,
        is_enabled: row.get::<_, i64>(2)? != 0,
        last_scanned_at: row.get(3)?,
        created_at: row.get(4)?,
    })
}

use rusqlite::{params, Connection};

use crate::{errors::AppResult, models::CustomExtension};

pub struct CustomExtensionRepository;

impl CustomExtensionRepository {
    pub fn list(connection: &Connection) -> AppResult<Vec<CustomExtension>> {
        let mut statement = connection.prepare(
            "SELECT id, extension, daw_name, is_enabled, created_at
             FROM custom_extensions
             ORDER BY extension COLLATE NOCASE",
        )?;
        let extensions = statement
            .query_map([], map_extension)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(extensions)
    }

    pub fn enabled(connection: &Connection) -> AppResult<Vec<CustomExtension>> {
        let mut statement = connection.prepare(
            "SELECT id, extension, daw_name, is_enabled, created_at
             FROM custom_extensions
             WHERE is_enabled = 1
             ORDER BY extension COLLATE NOCASE",
        )?;
        let extensions = statement
            .query_map([], map_extension)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(extensions)
    }

    pub fn exists(connection: &Connection, extension: &str) -> AppResult<bool> {
        Ok(connection.query_row(
            "SELECT EXISTS(
                SELECT 1 FROM custom_extensions WHERE extension = ?1 COLLATE NOCASE
             )",
            params![extension],
            |row| row.get(0),
        )?)
    }

    pub fn insert(
        connection: &Connection,
        extension: &str,
        daw_name: &str,
    ) -> AppResult<CustomExtension> {
        connection.execute(
            "INSERT INTO custom_extensions (extension, daw_name) VALUES (?1, ?2)",
            params![extension, daw_name],
        )?;
        let id = connection.last_insert_rowid();
        Ok(connection.query_row(
            "SELECT id, extension, daw_name, is_enabled, created_at
             FROM custom_extensions WHERE id = ?1",
            params![id],
            map_extension,
        )?)
    }

    pub fn set_enabled(connection: &Connection, id: i64, enabled: bool) -> AppResult<()> {
        connection.execute(
            "UPDATE custom_extensions SET is_enabled = ?1 WHERE id = ?2",
            params![enabled, id],
        )?;
        Ok(())
    }

    pub fn remove(connection: &Connection, id: i64) -> AppResult<()> {
        connection.execute(
            "DELETE FROM custom_extensions WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }
}

fn map_extension(row: &rusqlite::Row<'_>) -> rusqlite::Result<CustomExtension> {
    Ok(CustomExtension {
        id: row.get(0)?,
        extension: row.get(1)?,
        daw_name: row.get(2)?,
        is_enabled: row.get::<_, i64>(3)? != 0,
        created_at: row.get(4)?,
    })
}

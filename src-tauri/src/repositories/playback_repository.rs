use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::AppResult,
    models::{PlayableTrack, PlaybackTrackRef},
};

const SESSION_KEY: &str = "player.session.v1";

pub struct PlaybackRepository;

impl PlaybackRepository {
    pub fn load_raw(connection: &Connection) -> AppResult<Option<String>> {
        connection.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [SESSION_KEY],
            |row| row.get(0),
        ).optional().map_err(Into::into)
    }

    pub fn save_raw(connection: &Connection, value: &str) -> AppResult<()> {
        connection.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![SESSION_KEY, value],
        )?;
        Ok(())
    }

    pub fn resolve_track(
        connection: &Connection,
        reference: PlaybackTrackRef,
    ) -> AppResult<Option<PlayableTrack>> {
        let row = connection.query_row(
            "SELECT pf.id, pf.project_id, p.display_name, pf.file_name,
                    pf.file_type, pf.category, pf.file_path
             FROM project_files pf
             JOIN projects p ON p.id = pf.project_id
             WHERE pf.id = ?1 AND pf.project_id = ?2",
            params![reference.file_id, reference.project_id],
            |row| Ok((
                row.get::<_, i64>(0)?, row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?, row.get::<_, String>(3)?,
                row.get::<_, String>(4)?, row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            )),
        ).optional()?;
        Ok(row.map(|(file_id, project_id, project_name, file_name, file_type, category, path)| {
            PlayableTrack {
                project_id, file_id, project_name, file_name, file_type, category,
                is_missing: !Path::new(&path).exists(),
            }
        }))
    }
}

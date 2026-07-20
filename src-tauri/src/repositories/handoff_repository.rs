use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::AppResult,
    models::HandoffSettings,
};

pub struct HandoffRepository;

impl HandoffRepository {
    pub fn settings(connection: &Connection, project_id: i64) -> AppResult<HandoffSettings> {
        let stored = connection
            .query_row(
                "SELECT daw_version, time_signature, common_start,
                        collaborator_notes, plugins_json
                 FROM project_handoff_settings WHERE project_id = ?1",
                [project_id],
                |row| {
                    let plugins_json: String = row.get(4)?;
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        plugins_json,
                    ))
                },
            )
            .optional()?;
        let Some((daw_version, time_signature, common_start, collaborator_notes, plugins_json)) = stored else {
            return Ok(HandoffSettings::default());
        };
        Ok(HandoffSettings {
            daw_version,
            time_signature,
            common_start,
            collaborator_notes,
            plugins: serde_json::from_str(&plugins_json)?,
        })
    }

    pub fn next_version(connection: &Connection, project_id: i64) -> AppResult<i64> {
        Ok(connection.query_row(
            "SELECT COALESCE(MAX(version_number), 0) + 1
             FROM handoff_exports WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )?)
    }

    pub fn save_export(
        connection: &mut Connection,
        project_id: i64,
        settings: &HandoffSettings,
        version_number: i64,
        destination_path: &str,
        file_count: i64,
    ) -> AppResult<()> {
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT INTO project_handoff_settings
             (project_id, daw_version, time_signature, common_start,
              collaborator_notes, plugins_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(project_id) DO UPDATE SET
               daw_version = excluded.daw_version,
               time_signature = excluded.time_signature,
               common_start = excluded.common_start,
               collaborator_notes = excluded.collaborator_notes,
               plugins_json = excluded.plugins_json,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![
                project_id,
                settings.daw_version,
                settings.time_signature,
                settings.common_start,
                settings.collaborator_notes,
                serde_json::to_string(&settings.plugins)?
            ],
        )?;
        transaction.execute(
            "INSERT INTO handoff_exports
             (project_id, version_number, destination_path, file_count)
             VALUES (?1, ?2, ?3, ?4)",
            params![project_id, version_number, destination_path, file_count],
        )?;
        transaction.commit()?;
        Ok(())
    }
    pub fn export_exists(
        connection: &Connection,
        project_id: i64,
        destination_path: &str,
    ) -> AppResult<bool> {
        Ok(connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM handoff_exports
             WHERE project_id = ?1 AND destination_path = ?2)",
            params![project_id, destination_path],
            |row| row.get(0),
        )?)
    }
}

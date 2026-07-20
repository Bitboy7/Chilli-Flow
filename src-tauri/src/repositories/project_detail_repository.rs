use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::{AppError, AppResult},
    models::{ProjectDetail, ProjectFolderCategory, ProjectFolderPaths, UpdateProjectInput},
};

pub struct ProjectDetailRepository;

impl ProjectDetailRepository {
    pub fn get(connection: &Connection, project_id: i64) -> AppResult<ProjectDetail> {
        let mut detail = connection
            .query_row(
                "SELECT p.id, p.display_name, p.original_name, p.file_path,
                        p.extension, p.daw, p.cover_path, p.preview_path, p.bpm,
                        p.musical_key, p.genre, p.status, ps.label, ps.color,
                        p.rating, p.notes, p.is_favorite, p.file_size,
                        p.file_created_at, p.file_modified_at, p.indexed_at,
                        p.updated_at, p.is_missing, p.workspace_root, p.source_kind,
                        COALESCE((
                          SELECT group_concat(name, char(31)) FROM (
                            SELECT t.name AS name FROM project_tags pt
                            JOIN tags t ON t.id = pt.tag_id
                            WHERE pt.project_id = p.id
                            ORDER BY t.name COLLATE NOCASE
                          )
                        ), '')
                 FROM projects p
                 JOIN project_statuses ps ON ps.key = p.status
                 WHERE p.id = ?1",
                [project_id],
                map_project_detail,
            )
            .optional()?
            .ok_or(AppError::ProjectNotFound)?;
        detail.folders = Self::folder_paths(connection, project_id)?;
        Ok(detail)
    }

    pub fn update(
        connection: &mut Connection,
        project_id: i64,
        input: &UpdateProjectInput,
    ) -> AppResult<ProjectDetail> {
        let transaction = connection.transaction()?;
        let status_exists: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM project_statuses WHERE key = ?1)",
            [&input.status],
            |row| row.get(0),
        )?;
        if !status_exists {
            return Err(AppError::InvalidProject("estado desconocido".into()));
        }

        let changed = transaction.execute(
            "UPDATE projects SET display_name = ?1, bpm = ?2, musical_key = ?3,
                    genre = ?4, status = ?5, rating = ?6, notes = ?7,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?8",
            params![
                input.display_name,
                input.bpm,
                input.musical_key,
                input.genre,
                input.status,
                input.rating,
                input.notes,
                project_id,
            ],
        )?;
        if changed == 0 {
            return Err(AppError::ProjectNotFound);
        }

        transaction.execute("DELETE FROM project_tags WHERE project_id = ?1", [project_id])?;
        for tag in &input.tags {
            transaction.execute(
                "INSERT INTO tags (name) VALUES (?1) ON CONFLICT(name) DO NOTHING",
                [tag],
            )?;
            let tag_id: i64 = transaction.query_row(
                "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                [tag],
                |row| row.get(0),
            )?;
            transaction.execute(
                "INSERT INTO project_tags (project_id, tag_id) VALUES (?1, ?2)",
                params![project_id, tag_id],
            )?;
        }
        transaction.execute(
            "DELETE FROM tags WHERE NOT EXISTS (
                SELECT 1 FROM project_tags WHERE project_tags.tag_id = tags.id
             )",
            [],
        )?;
        transaction.commit()?;
        Self::get(connection, project_id)
    }

    pub fn set_favorite(
        connection: &Connection,
        project_id: i64,
        favorite: bool,
    ) -> AppResult<()> {
        ensure_changed(connection.execute(
            "UPDATE projects SET is_favorite = ?1,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?2",
            params![favorite, project_id],
        )?)
    }

    pub fn set_cover(
        connection: &Connection,
        project_id: i64,
        cover_path: Option<&str>,
    ) -> AppResult<()> {
        ensure_changed(connection.execute(
            "UPDATE projects SET cover_path = ?1,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?2",
            params![cover_path, project_id],
        )?)
    }

    pub fn update_physical_path(
        connection: &Connection,
        project_id: i64,
        file_path: &str,
        original_name: &str,
    ) -> AppResult<()> {
        ensure_changed(connection.execute(
            "UPDATE projects SET file_path = ?1, original_name = ?2,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?3",
            params![file_path, original_name, project_id],
        )?)
    }

    pub fn watched_paths(connection: &Connection) -> AppResult<Vec<String>> {
        let mut statement = connection.prepare("SELECT folder_path FROM watched_folders")?;
        let paths = statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(paths)
    }

    pub fn set_folder(
        connection: &Connection,
        project_id: i64,
        category: ProjectFolderCategory,
        folder_path: Option<&str>,
    ) -> AppResult<()> {
        let exists: bool = connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        if let Some(path) = folder_path {
            connection.execute(
                "INSERT INTO project_folders (project_id, category, folder_path)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(project_id, category) DO UPDATE SET
                   folder_path = excluded.folder_path,
                   updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
                params![project_id, category.as_str(), path],
            )?;
        } else {
            connection.execute(
                "DELETE FROM project_folders WHERE project_id = ?1 AND category = ?2",
                params![project_id, category.as_str()],
            )?;
        }
        Ok(())
    }

    fn folder_paths(connection: &Connection, project_id: i64) -> AppResult<ProjectFolderPaths> {
        let mut folders = ProjectFolderPaths::default();
        let mut statement = connection.prepare(
            "SELECT category, folder_path FROM project_folders WHERE project_id = ?1",
        )?;
        let rows = statement.query_map([project_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        for (category, path) in rows {
            match category.as_str() {
                "stems" => folders.stems = Some(path),
                "mixes" => folders.mixes = Some(path),
                "masters" => folders.masters = Some(path),
                "references" => folders.references = Some(path),
                _ => {}
            }
        }
        Ok(folders)
    }
}

fn ensure_changed(changed: usize) -> AppResult<()> {
    if changed == 0 {
        Err(AppError::ProjectNotFound)
    } else {
        Ok(())
    }
}

fn map_project_detail(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectDetail> {
    let tags: String = row.get(25)?;
    Ok(ProjectDetail {
        id: row.get(0)?,
        display_name: row.get(1)?,
        original_name: row.get(2)?,
        file_path: row.get(3)?,
        extension: row.get(4)?,
        daw: row.get(5)?,
        cover_path: row.get(6)?,
        preview_path: row.get(7)?,
        bpm: row.get(8)?,
        musical_key: row.get(9)?,
        genre: row.get(10)?,
        status: row.get(11)?,
        status_label: row.get(12)?,
        status_color: row.get(13)?,
        rating: row.get(14)?,
        notes: row.get(15)?,
        is_favorite: row.get::<_, i64>(16)? != 0,
        file_size: row.get(17)?,
        file_created_at: row.get(18)?,
        file_modified_at: row.get(19)?,
        indexed_at: row.get(20)?,
        updated_at: row.get(21)?,
        is_missing: row.get::<_, i64>(22)? != 0,
        workspace_root: row.get(23)?,
        source_kind: row.get(24)?,
        tags: if tags.is_empty() {
            Vec::new()
        } else {
            tags.split('\u{1f}').map(str::to_owned).collect()
        },
        folders: ProjectFolderPaths::default(),
    })
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use crate::database::{configure_connection, migrations};

    use super::*;

    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("database");
        configure_connection(&connection).expect("configure");
        migrations::run(&mut connection).expect("migrate");
        connection.execute(
            "INSERT INTO projects (display_name, original_name, file_path, extension, daw)
             VALUES ('Original', 'beat.flp', 'C:/Music/beat.flp', '.flp', 'FL Studio')",
            [],
        ).expect("project");
        connection
    }

    #[test]
    fn updates_metadata_and_replaces_tags_without_renaming_the_file() {
        let mut connection = database();
        let detail = ProjectDetailRepository::update(&mut connection, 1, &UpdateProjectInput {
            display_name: "Night Drive".into(),
            bpm: Some(126.0),
            musical_key: Some("F#m".into()),
            genre: Some("House".into()),
            status: "mixing".into(),
            rating: Some(5),
            notes: Some("Ready for feedback".into()),
            tags: vec!["client".into(), "urgent".into()],
        }).expect("update");

        assert_eq!(detail.display_name, "Night Drive");
        assert_eq!(detail.original_name, "beat.flp");
        assert_eq!(detail.file_path, "C:/Music/beat.flp");
        assert_eq!(detail.tags, vec!["client", "urgent"]);
    }

    #[test]
    fn favorite_is_persisted() {
        let connection = database();
        ProjectDetailRepository::set_favorite(&connection, 1, true).expect("favorite");
        assert!(ProjectDetailRepository::get(&connection, 1).expect("detail").is_favorite);
    }

    #[test]
    fn project_folder_paths_are_independent_and_replaceable() {
        let connection = database();
        ProjectDetailRepository::set_folder(
            &connection, 1, ProjectFolderCategory::Stems, Some("C:/Music/Stems"),
        ).expect("set stems");
        ProjectDetailRepository::set_folder(
            &connection, 1, ProjectFolderCategory::Masters, Some("C:/Music/Masters"),
        ).expect("set masters");
        let detail = ProjectDetailRepository::get(&connection, 1).expect("detail");
        assert_eq!(detail.folders.stems.as_deref(), Some("C:/Music/Stems"));
        assert_eq!(detail.folders.masters.as_deref(), Some("C:/Music/Masters"));
        ProjectDetailRepository::set_folder(
            &connection, 1, ProjectFolderCategory::Stems, None,
        ).expect("clear stems");
        assert_eq!(ProjectDetailRepository::get(&connection, 1).expect("detail").folders.stems, None);
    }
}

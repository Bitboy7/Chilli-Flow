use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::{AppError, AppResult},
    models::{ProjectFile, ProjectFileCategory},
};

#[derive(Clone, Copy)]
pub struct NewProjectFile<'a> {
    pub path: &'a str,
    pub name: &'a str,
    pub file_type: &'a str,
    pub size: i64,
}

#[derive(Clone, Copy)]
pub struct DiscoveredProjectFile<'a> {
    pub path: &'a str,
    pub name: &'a str,
    pub file_type: &'a str,
    pub size: i64,
    pub category: ProjectFileCategory,
    pub source_label: &'a str,
    pub relative_path: &'a str,
}

pub struct ProjectFileRepository;

impl ProjectFileRepository {
    pub fn list(connection: &Connection, project_id: i64) -> AppResult<Vec<ProjectFile>> {
        let exists: bool = connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        let mut statement = connection.prepare(
            "SELECT id, project_id, file_path, file_name, file_type, category,
                    file_size, created_at, origin, source_label, relative_path
             FROM project_files
             WHERE project_id = ?1 AND is_ignored = 0
             ORDER BY category, source_label COLLATE NOCASE, file_name COLLATE NOCASE, id",
        )?;
        let rows = statement.query_map([project_id], map_project_file)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn add_batch(
        connection: &mut Connection,
        project_id: i64,
        category: ProjectFileCategory,
        files: &[NewProjectFile<'_>],
    ) -> AppResult<Vec<ProjectFile>> {
        let transaction = connection.transaction()?;
        ensure_project(&transaction, project_id)?;
        {
            let mut insert = transaction.prepare(
                "INSERT INTO project_files
                 (project_id, file_path, file_name, file_type, category, file_size,
                  origin, category_overridden, is_ignored, last_seen_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'manual', 1, 0,
                         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                 ON CONFLICT(project_id, file_path) DO UPDATE SET
                   file_name = excluded.file_name,
                   file_type = excluded.file_type,
                   category = excluded.category,
                   file_size = excluded.file_size,
                   origin = 'manual',
                   source_label = NULL,
                   relative_path = NULL,
                   category_overridden = 1,
                   is_ignored = 0,
                   last_seen_at = excluded.last_seen_at",
            )?;
            for file in files {
                insert.execute(params![project_id, file.path, file.name, file.file_type, category.as_str(), file.size])?;
            }
        }
        transaction.commit()?;
        Self::list(connection, project_id)
    }

    pub fn sync_discovered(
        connection: &mut Connection,
        project_id: i64,
        files: &[DiscoveredProjectFile<'_>],
    ) -> AppResult<usize> {
        let transaction = connection.transaction()?;
        ensure_project(&transaction, project_id)?;
        let existing = {
            let mut statement = transaction.prepare(
                "SELECT file_path FROM project_files WHERE project_id = ?1",
            )?;
            let rows = statement.query_map([project_id], |row| row.get::<_, String>(0))?;
            let collected = rows.collect::<Result<HashSet<_>, _>>()?;
            collected
        };
        let mut discovered_count = 0;
        {
            let mut insert = transaction.prepare(
                "INSERT INTO project_files
                 (project_id, file_path, file_name, file_type, category, file_size,
                  origin, source_label, relative_path, last_seen_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'discovered', ?7, ?8,
                         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                 ON CONFLICT(project_id, file_path) DO UPDATE SET
                   file_name = excluded.file_name,
                   file_type = excluded.file_type,
                   category = CASE
                     WHEN project_files.origin = 'manual' OR project_files.category_overridden = 1
                     THEN project_files.category ELSE excluded.category END,
                   file_size = excluded.file_size,
                   source_label = CASE WHEN project_files.origin = 'manual'
                     THEN project_files.source_label ELSE excluded.source_label END,
                   relative_path = CASE WHEN project_files.origin = 'manual'
                     THEN project_files.relative_path ELSE excluded.relative_path END,
                   last_seen_at = excluded.last_seen_at",
            )?;
            for file in files {
                if !existing.contains(file.path) {
                    discovered_count += 1;
                }
                insert.execute(params![
                    project_id,
                    file.path,
                    file.name,
                    file.file_type,
                    file.category.as_str(),
                    file.size,
                    file.source_label,
                    file.relative_path,
                ])?;
            }
        }
        transaction.commit()?;
        Ok(discovered_count)
    }

    pub fn get(connection: &Connection, file_id: i64) -> AppResult<ProjectFile> {
        connection.query_row(
            "SELECT id, project_id, file_path, file_name, file_type, category,
                    file_size, created_at, origin, source_label, relative_path
             FROM project_files WHERE id = ?1 AND is_ignored = 0",
            [file_id], map_project_file,
        ).optional()?.ok_or(AppError::AssociatedFileNotFound)
    }

    pub fn remove(connection: &mut Connection, project_id: i64, file_id: i64) -> AppResult<()> {
        let transaction = connection.transaction()?;
        let (path, origin): (String, String) = transaction.query_row(
            "SELECT file_path, origin FROM project_files WHERE id = ?1 AND project_id = ?2 AND is_ignored = 0",
            params![file_id, project_id], |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional()?.ok_or(AppError::AssociatedFileNotFound)?;
        transaction.execute(
            "UPDATE projects SET preview_path = NULL,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1 AND preview_path = ?2",
            params![project_id, path],
        )?;
        if origin == "discovered" {
            transaction.execute(
                "UPDATE project_files SET is_ignored = 1 WHERE id = ?1",
                [file_id],
            )?;
        } else {
            transaction.execute("DELETE FROM project_files WHERE id = ?1", [file_id])?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn set_category(
        connection: &Connection,
        project_id: i64,
        file_id: i64,
        category: ProjectFileCategory,
    ) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE project_files
             SET category = ?1, category_overridden = 1
             WHERE id = ?2 AND project_id = ?3 AND is_ignored = 0",
            params![category.as_str(), file_id, project_id],
        )?;
        if changed == 0 { Err(AppError::AssociatedFileNotFound) } else { Ok(()) }
    }

    pub fn set_preview(connection: &Connection, project_id: i64, file_id: Option<i64>) -> AppResult<Option<String>> {
        let path = match file_id {
            Some(file_id) => Some(connection.query_row(
                "SELECT file_path FROM project_files
                 WHERE id = ?1 AND project_id = ?2 AND is_ignored = 0",
                params![file_id, project_id], |row| row.get::<_, String>(0),
            ).optional()?.ok_or(AppError::AssociatedFileNotFound)?),
            None => None,
        };
        let changed = connection.execute(
            "UPDATE projects SET preview_path = ?1,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?2",
            params![path, project_id],
        )?;
        if changed == 0 { return Err(AppError::ProjectNotFound); }
        Ok(path)
    }
}

fn ensure_project(connection: &Connection, project_id: i64) -> AppResult<()> {
    let exists: bool = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
    )?;
    if exists { Ok(()) } else { Err(AppError::ProjectNotFound) }
}

fn map_project_file(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectFile> {
    let path: String = row.get(2)?;
    Ok(ProjectFile {
        id: row.get(0)?, project_id: row.get(1)?, file_path: path.clone(),
        file_name: row.get(3)?, file_type: row.get(4)?, category: row.get(5)?,
        file_size: row.get(6)?, created_at: row.get(7)?,
        is_missing: !std::path::Path::new(&path).exists(),
        origin: row.get(8)?, source_label: row.get(9)?, relative_path: row.get(10)?,
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
        migrations::run(&mut connection).expect("migrations");
        connection.execute("INSERT INTO projects (display_name, original_name, file_path, extension, daw) VALUES ('Demo','demo.flp','C:/demo.flp','.flp','FL Studio')", []).expect("project");
        connection
    }

    #[test]
    fn upserts_duplicate_paths_and_updates_the_category() {
        let mut connection = database();
        let file = NewProjectFile { path: "C:/mix.wav", name: "mix.wav", file_type: "wav", size: 42 };
        ProjectFileRepository::add_batch(&mut connection, 1, ProjectFileCategory::Mix, &[file]).expect("first");
        ProjectFileRepository::add_batch(&mut connection, 1, ProjectFileCategory::Master, &[file]).expect("second");
        let files = ProjectFileRepository::list(&connection, 1).expect("list");
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].category, "master");
        assert_eq!(files[0].origin, "manual");
    }

    #[test]
    fn removing_selected_preview_clears_the_project_path() {
        let mut connection = database();
        let file = NewProjectFile { path: "C:/preview.mp3", name: "preview.mp3", file_type: "mp3", size: 42 };
        let files = ProjectFileRepository::add_batch(&mut connection, 1, ProjectFileCategory::Mix, &[file]).expect("add");
        ProjectFileRepository::set_preview(&connection, 1, Some(files[0].id)).expect("preview");
        ProjectFileRepository::remove(&mut connection, 1, files[0].id).expect("remove");
        let preview: Option<String> = connection.query_row("SELECT preview_path FROM projects WHERE id = 1", [], |row| row.get(0)).expect("path");
        assert_eq!(preview, None);
    }

    #[test]
    fn selecting_a_new_preview_replaces_the_previous_one() {
        let mut connection = database();
        let files = [
            NewProjectFile { path: "C:/first.wav", name: "first.wav", file_type: "wav", size: 42 },
            NewProjectFile { path: "C:/second.wav", name: "second.wav", file_type: "wav", size: 84 },
        ];
        let files = ProjectFileRepository::add_batch(
            &mut connection,
            1,
            ProjectFileCategory::Mix,
            &files,
        ).expect("add");
        ProjectFileRepository::set_preview(&connection, 1, Some(files[0].id)).expect("first");
        ProjectFileRepository::set_preview(&connection, 1, Some(files[1].id)).expect("second");

        let preview: Option<String> = connection
            .query_row("SELECT preview_path FROM projects WHERE id = 1", [], |row| row.get(0))
            .expect("path");
        assert_eq!(preview.as_deref(), Some("C:/second.wav"));
    }

    #[test]
    fn reclassifies_an_existing_file_without_changing_its_path() {
        let mut connection = database();
        let file = NewProjectFile { path: "C:/take.wav", name: "take.wav", file_type: "wav", size: 42 };
        let files = ProjectFileRepository::add_batch(&mut connection, 1, ProjectFileCategory::Stem, &[file]).expect("add");
        ProjectFileRepository::set_category(&connection, 1, files[0].id, ProjectFileCategory::Mix).expect("category");
        let updated = ProjectFileRepository::get(&connection, files[0].id).expect("file");
        assert_eq!(updated.category, "mix");
        assert_eq!(updated.file_path, "C:/take.wav");
    }

    #[test]
    fn keeps_user_category_and_hides_removed_discovered_files() {
        let mut connection = database();
        let discovered = DiscoveredProjectFile {
            path: "C:/Renders/Mixes/demo.wav",
            name: "demo.wav",
            file_type: "wav",
            size: 128,
            category: ProjectFileCategory::Mix,
            source_label: "Renders / Mezclas",
            relative_path: "Renders/Mixes/demo.wav",
        };
        assert_eq!(ProjectFileRepository::sync_discovered(&mut connection, 1, &[discovered]).expect("sync"), 1);
        let file = ProjectFileRepository::list(&connection, 1).expect("list").remove(0);
        assert_eq!(file.origin, "discovered");
        ProjectFileRepository::set_category(&connection, 1, file.id, ProjectFileCategory::Master).expect("category");
        ProjectFileRepository::sync_discovered(&mut connection, 1, &[discovered]).expect("resync");
        assert_eq!(ProjectFileRepository::get(&connection, file.id).expect("updated").category, "master");
        ProjectFileRepository::remove(&mut connection, 1, file.id).expect("hide");
        assert!(ProjectFileRepository::list(&connection, 1).expect("list").is_empty());
        assert_eq!(ProjectFileRepository::sync_discovered(&mut connection, 1, &[discovered]).expect("ignored"), 0);
        assert!(ProjectFileRepository::list(&connection, 1).expect("list").is_empty());
    }
}

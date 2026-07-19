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

pub struct ProjectFileRepository;

impl ProjectFileRepository {
    pub fn list(connection: &Connection, project_id: i64) -> AppResult<Vec<ProjectFile>> {
        let exists: bool = connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        let mut statement = connection.prepare(
            "SELECT id, project_id, file_path, file_name, file_type, category,
                    file_size, created_at
             FROM project_files WHERE project_id = ?1
             ORDER BY category, file_name COLLATE NOCASE, id",
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
        let exists: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        {
            let mut insert = transaction.prepare(
                "INSERT INTO project_files
                 (project_id, file_path, file_name, file_type, category, file_size)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(project_id, file_path) DO UPDATE SET
                   file_name = excluded.file_name,
                   file_type = excluded.file_type,
                   category = excluded.category,
                   file_size = excluded.file_size",
            )?;
            for file in files {
                insert.execute(params![project_id, file.path, file.name, file.file_type, category.as_str(), file.size])?;
            }
        }
        transaction.commit()?;
        Self::list(connection, project_id)
    }

    pub fn get(connection: &Connection, file_id: i64) -> AppResult<ProjectFile> {
        connection.query_row(
            "SELECT id, project_id, file_path, file_name, file_type, category,
                    file_size, created_at FROM project_files WHERE id = ?1",
            [file_id], map_project_file,
        ).optional()?.ok_or(AppError::AssociatedFileNotFound)
    }

    pub fn remove(connection: &mut Connection, project_id: i64, file_id: i64) -> AppResult<()> {
        let transaction = connection.transaction()?;
        let path: String = transaction.query_row(
            "SELECT file_path FROM project_files WHERE id = ?1 AND project_id = ?2",
            params![file_id, project_id], |row| row.get(0),
        ).optional()?.ok_or(AppError::AssociatedFileNotFound)?;
        transaction.execute(
            "UPDATE projects SET preview_path = NULL,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1 AND preview_path = ?2",
            params![project_id, path],
        )?;
        transaction.execute("DELETE FROM project_files WHERE id = ?1", [file_id])?;
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
            "UPDATE project_files SET category = ?1 WHERE id = ?2 AND project_id = ?3",
            params![category.as_str(), file_id, project_id],
        )?;
        if changed == 0 { Err(AppError::AssociatedFileNotFound) } else { Ok(()) }
    }

    pub fn set_preview(connection: &Connection, project_id: i64, file_id: Option<i64>) -> AppResult<Option<String>> {
        let path = match file_id {
            Some(file_id) => Some(connection.query_row(
                "SELECT file_path FROM project_files WHERE id = ?1 AND project_id = ?2",
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

fn map_project_file(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectFile> {
    let path: String = row.get(2)?;
    Ok(ProjectFile {
        id: row.get(0)?, project_id: row.get(1)?, file_path: path.clone(),
        file_name: row.get(3)?, file_type: row.get(4)?, category: row.get(5)?,
        file_size: row.get(6)?, created_at: row.get(7)?,
        is_missing: !std::path::Path::new(&path).exists(),
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
    }

    #[test]
    fn removing_selected_preview_clears_the_project_path() {
        let mut connection = database();
        let file = NewProjectFile { path: "C:/preview.mp3", name: "preview.mp3", file_type: "mp3", size: 42 };
        let files = ProjectFileRepository::add_batch(&mut connection, 1, ProjectFileCategory::Preview, &[file]).expect("add");
        ProjectFileRepository::set_preview(&connection, 1, Some(files[0].id)).expect("preview");
        ProjectFileRepository::remove(&mut connection, 1, files[0].id).expect("remove");
        let preview: Option<String> = connection.query_row("SELECT preview_path FROM projects WHERE id = 1", [], |row| row.get(0)).expect("path");
        assert_eq!(preview, None);
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
}

use std::{collections::HashSet, path::Path};

use rusqlite::{params, Connection};

use crate::{errors::AppResult, models::DiscoveredProject};

#[derive(Debug, Default)]
pub struct UpsertSummary {
    pub created: u64,
    pub updated: u64,
}

pub struct ProjectRepository;

impl ProjectRepository {
    pub fn upsert_batch(
        connection: &mut Connection,
        projects: &[DiscoveredProject],
    ) -> AppResult<UpsertSummary> {
        let transaction = connection.transaction()?;
        let mut summary = UpsertSummary::default();

        {
            let mut insert = transaction.prepare(
                "INSERT OR IGNORE INTO projects (
                    display_name, original_name, file_path, extension, daw,
                    file_size, file_created_at, file_modified_at, is_missing
                 ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6,
                    CASE WHEN ?7 IS NULL THEN NULL
                         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?7, 'unixepoch') END,
                    CASE WHEN ?8 IS NULL THEN NULL
                         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?8, 'unixepoch') END,
                    0
                 )",
            )?;
            let mut update = transaction.prepare(
                "UPDATE projects
                 SET original_name = ?1,
                     extension = ?2,
                     daw = ?3,
                     file_size = ?4,
                     file_created_at = CASE WHEN ?5 IS NULL THEN NULL
                         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?5, 'unixepoch') END,
                     file_modified_at = CASE WHEN ?6 IS NULL THEN NULL
                         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?6, 'unixepoch') END,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                     is_missing = 0
                 WHERE file_path = ?7",
            )?;

            for project in projects {
                let inserted = insert.execute(params![
                    project.display_name,
                    project.original_name,
                    project.file_path,
                    project.extension,
                    project.daw,
                    as_i64(project.file_size),
                    project.file_created_at,
                    project.file_modified_at,
                ])?;

                if inserted == 1 {
                    summary.created += 1;
                } else {
                    update.execute(params![
                        project.original_name,
                        project.extension,
                        project.daw,
                        as_i64(project.file_size),
                        project.file_created_at,
                        project.file_modified_at,
                        project.file_path,
                    ])?;
                    summary.updated += 1;
                }
            }
        }

        transaction.commit()?;
        Ok(summary)
    }

    pub fn mark_missing_in_folder(
        connection: &mut Connection,
        folder_path: &Path,
        discovered_paths: &HashSet<String>,
    ) -> AppResult<u64> {
        let candidates = {
            let mut statement =
                connection.prepare("SELECT id, file_path, is_missing FROM projects")?;
            let rows = statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)? != 0,
                    ))
                })?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };

        let transaction = connection.transaction()?;
        let mut marked_missing = 0_u64;
        {
            let mut update = transaction.prepare(
                "UPDATE projects
                 SET is_missing = 1,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?1",
            )?;

            for (project_id, file_path, is_missing) in candidates {
                if !is_missing
                    && Path::new(&file_path).starts_with(folder_path)
                    && !discovered_paths.contains(&file_path)
                {
                    update.execute(params![project_id])?;
                    marked_missing += 1;
                }
            }
        }

        transaction.commit()?;
        Ok(marked_missing)
    }
}

fn as_i64(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use rusqlite::Connection;

    use crate::database::{configure_connection, migrations};

    use super::*;

    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        configure_connection(&connection).expect("configure database");
        migrations::run(&mut connection).expect("migrations");
        connection
    }

    fn project(file_path: &str, file_size: u64) -> DiscoveredProject {
        DiscoveredProject {
            display_name: "Original display name".to_string(),
            original_name: "beat.flp".to_string(),
            file_path: file_path.to_string(),
            extension: ".flp".to_string(),
            daw: "FL Studio".to_string(),
            file_size,
            file_created_at: None,
            file_modified_at: None,
        }
    }

    #[test]
    fn inserts_then_updates_without_overwriting_display_name() {
        let mut connection = database();
        let first = ProjectRepository::upsert_batch(
            &mut connection,
            &[project("C:/Music/beat.flp", 10)],
        )
        .expect("first upsert");
        connection
            .execute(
                "UPDATE projects SET display_name = 'My edited title'",
                [],
            )
            .expect("edit title");
        let second = ProjectRepository::upsert_batch(
            &mut connection,
            &[project("C:/Music/beat.flp", 20)],
        )
        .expect("second upsert");

        let (display_name, file_size): (String, i64) = connection
            .query_row(
                "SELECT display_name, file_size FROM projects",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("stored project");

        assert_eq!(first.created, 1);
        assert_eq!(second.updated, 1);
        assert_eq!(display_name, "My edited title");
        assert_eq!(file_size, 20);
    }

    #[test]
    fn marks_projects_missing_only_inside_scanned_folder() {
        let mut connection = database();
        ProjectRepository::upsert_batch(
            &mut connection,
            &[
                project("C:/Music/beat.flp", 10),
                project("D:/Archive/old.flp", 10),
            ],
        )
        .expect("seed projects");

        let marked = ProjectRepository::mark_missing_in_folder(
            &mut connection,
            Path::new("C:/Music"),
            &HashSet::new(),
        )
        .expect("mark missing");
        let missing_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE is_missing = 1",
                [],
                |row| row.get(0),
            )
            .expect("missing count");

        assert_eq!(marked, 1);
        assert_eq!(missing_count, 1);
    }
}

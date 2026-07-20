use std::{collections::{HashMap, HashSet}, path::Path};

use rusqlite::{params, Connection, OptionalExtension};

use crate::{errors::AppResult, models::DiscoveredProject};

#[derive(Debug, Default)]
pub struct UpsertSummary {
    pub created: u64,
    pub updated: u64,
}

pub struct ProjectRepository;

impl ProjectRepository {
    pub fn reconcile_moved_in_folder(
        connection: &mut Connection,
        folder_path: &Path,
        projects: &[DiscoveredProject],
        discovered_paths: &HashSet<String>,
    ) -> AppResult<u64> {
        let folder = folder_path.to_string_lossy();
        let existing = {
            let mut statement = connection.prepare(
                "SELECT id, original_name, file_path, extension, file_size
                 FROM projects
                 WHERE file_path = ?1
                    OR substr(file_path, 1, length(?1) + 1) = ?1 || '/'
                    OR substr(file_path, 1, length(?1) + 1) = ?1 || '\'",
            )?;
            let rows = statement.query_map([folder.as_ref()], |row| Ok((
                row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, String>(3)?, row.get::<_, i64>(4)?,
            )))?.collect::<Result<Vec<_>, _>>()?;
            rows
        };
        let existing_paths = existing.iter().map(|item| item.2.clone()).collect::<HashSet<_>>();
        let mut old_by_key: HashMap<(String, String, i64), Vec<(i64, String)>> = HashMap::new();
        for (id, name, path, extension, size) in existing {
            if Path::new(&path).starts_with(folder_path) && !discovered_paths.contains(&path) {
                old_by_key.entry((name.to_lowercase(), extension.to_lowercase(), size))
                    .or_default().push((id, path));
            }
        }
        let mut new_by_key: HashMap<(String, String, i64), Vec<&DiscoveredProject>> = HashMap::new();
        for project in projects.iter().filter(|project| !existing_paths.contains(&project.file_path)) {
            new_by_key.entry((
                project.original_name.to_lowercase(), project.extension.to_lowercase(),
                i64::try_from(project.file_size).unwrap_or(i64::MAX),
            )).or_default().push(project);
        }

        let transaction = connection.transaction()?;
        let mut moved = 0;
        for (key, old) in old_by_key {
            let Some(new) = new_by_key.get(&key) else { continue; };
            if old.len() != 1 || new.len() != 1 { continue; }
            let project = new[0];
            transaction.execute(
                "UPDATE projects SET file_path = ?1, original_name = ?2,
                     extension = ?3, daw = ?4, file_size = ?5,
                     file_created_at = CASE WHEN ?6 IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?6, 'unixepoch') END,
                     file_modified_at = CASE WHEN ?7 IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?7, 'unixepoch') END,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), is_missing = 0
                 WHERE id = ?8",
                params![project.file_path, project.original_name, project.extension, project.daw,
                    i64::try_from(project.file_size).unwrap_or(i64::MAX), project.file_created_at,
                    project.file_modified_at, old[0].0],
            )?;
            moved += 1;
        }
        transaction.commit()?;
        Ok(moved)
    }

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
                let pending_id: Option<i64> = transaction
                    .query_row(
                        "SELECT id FROM projects
                         WHERE source_kind = 'managed_pending'
                           AND daw = ?1 COLLATE NOCASE
                           AND workspace_root IS NOT NULL
                           AND (
                             ?2 = workspace_root
                             OR substr(?2, 1, length(workspace_root) + 1) = workspace_root || '/'
                             OR substr(?2, 1, length(workspace_root) + 1) = workspace_root || '\\'
                           )
                         ORDER BY length(workspace_root) DESC LIMIT 1",
                        params![project.daw, project.file_path],
                        |row| row.get(0),
                    )
                    .optional()?;
                if let Some(project_id) = pending_id {
                    transaction.execute(
                        "UPDATE projects
                         SET original_name = ?1, file_path = ?2, extension = ?3, daw = ?4,
                             file_size = ?5,
                             file_created_at = CASE WHEN ?6 IS NULL THEN NULL
                               ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?6, 'unixepoch') END,
                             file_modified_at = CASE WHEN ?7 IS NULL THEN NULL
                               ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?7, 'unixepoch') END,
                             source_kind = 'managed', is_missing = 0,
                             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                         WHERE id = ?8",
                        params![
                            project.original_name,
                            project.file_path,
                            project.extension,
                            project.daw,
                            as_i64(project.file_size),
                            project.file_created_at,
                            project.file_modified_at,
                            project_id
                        ],
                    )?;
                    summary.updated += 1;
                    continue;
                }
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
        let folder = folder_path.to_string_lossy();
        let candidates = {
            let mut statement = connection.prepare(
                "SELECT id, file_path, is_missing FROM projects
                 WHERE file_path = ?1
                    OR substr(file_path, 1, length(?1) + 1) = ?1 || '/'
                    OR substr(file_path, 1, length(?1) + 1) = ?1 || '\'",
            )?;
            let rows = statement
                .query_map([folder.as_ref()], |row| {
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

    #[test]
    fn reconciles_a_unique_moved_file_without_losing_editable_metadata() {
        let mut connection = database();
        ProjectRepository::upsert_batch(&mut connection, &[project("C:/Music/Old/beat.flp", 10)])
            .expect("seed project");
        connection.execute("UPDATE projects SET display_name = 'Keep me', notes = 'Important'", [])
            .expect("metadata");
        let moved_project = project("C:/Music/New/beat.flp", 10);
        let discovered = HashSet::from([moved_project.file_path.clone()]);

        let moved = ProjectRepository::reconcile_moved_in_folder(
            &mut connection, Path::new("C:/Music"), &[moved_project], &discovered,
        ).expect("reconcile");

        let row: (i64, String, String, Option<String>) = connection.query_row(
            "SELECT COUNT(*), file_path, display_name, notes FROM projects", [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        ).expect("project row");
        assert_eq!(moved, 1);
        assert_eq!(row.0, 1);
        assert_eq!(row.1, "C:/Music/New/beat.flp");
        assert_eq!(row.2, "Keep me");
        assert_eq!(row.3.as_deref(), Some("Important"));
    }

    #[test]
    fn does_not_guess_when_more_than_one_missing_project_has_the_same_signature() {
        let mut connection = database();
        ProjectRepository::upsert_batch(
            &mut connection,
            &[
                project("C:/Music/Version A/beat.flp", 10),
                project("C:/Music/Version B/beat.flp", 10),
            ],
        )
        .expect("seed ambiguous projects");
        let candidate = project("C:/Music/New/beat.flp", 10);
        let discovered = HashSet::from([candidate.file_path.clone()]);

        let moved = ProjectRepository::reconcile_moved_in_folder(
            &mut connection,
            Path::new("C:/Music"),
            &[candidate],
            &discovered,
        )
        .expect("safe reconciliation");

        assert_eq!(moved, 0);
        let unchanged: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE file_path LIKE 'C:/Music/Version %'",
                [],
                |row| row.get(0),
            )
            .expect("unchanged paths");
        assert_eq!(unchanged, 2);
    }

    #[test]
    fn promotes_the_first_daw_save_inside_a_managed_workspace() {
        let mut connection = database();
        connection.execute(
            "INSERT INTO projects
             (display_name, original_name, file_path, extension, daw, workspace_root, source_kind)
             VALUES ('Demo', 'Demo (esperando primer guardado)', 'C:/Music/Demo',
                     '.flp', 'FL Studio', 'C:/Music/Demo', 'managed_pending')",
            [],
        ).expect("pending workspace");

        let result = ProjectRepository::upsert_batch(
            &mut connection,
            &[project("C:/Music/Demo/Project Files/Demo.flp", 42)],
        ).expect("promote save");

        let row: (i64, String, String) = connection.query_row(
            "SELECT COUNT(*), file_path, source_kind FROM projects",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        ).expect("promoted project");
        assert_eq!(result.updated, 1);
        assert_eq!(row.0, 1);
        assert_eq!(row.1, "C:/Music/Demo/Project Files/Demo.flp");
        assert_eq!(row.2, "managed");
    }

}

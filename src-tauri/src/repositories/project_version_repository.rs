use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::{AppError, AppResult},
    models::{ProjectVersionItem, ProjectVersionSet},
};

pub struct ProjectVersionRepository;

impl ProjectVersionRepository {
    pub fn classify_discovered(connection: &Connection) -> AppResult<()> {
        let mut statement = connection.prepare(
            "SELECT id, original_name, file_path, extension, daw
             FROM projects WHERE parent_project_id IS NULL
               AND (version_confidence IS NULL OR version_kind <> 'primary')",
        )?;
        let rows = statement
            .query_map([], |row| {
                Ok(Candidate {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    extension: row.get(3)?,
                    daw: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(statement);

        for candidate in &rows {
            let Some(classification) = marker(candidate) else {
                continue;
            };
            let parents = rows
                .iter()
                .filter(|other| {
                    other.id != candidate.id
                        && marker(other).is_none()
                        && other.extension.eq_ignore_ascii_case(&candidate.extension)
                        && other.daw.eq_ignore_ascii_case(&candidate.daw)
                        && normalized_stem(&other.name) == classification.base
                })
                .collect::<Vec<_>>();
            if parents.len() == 1 {
                connection.execute(
                    "UPDATE projects
                     SET parent_project_id = ?1, version_kind = ?2, version_confidence = ?3,
                         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     WHERE id = ?4 AND parent_project_id IS NULL",
                    params![
                        parents[0].id,
                        classification.kind,
                        if classification.strong { "high" } else { "suggested" },
                        candidate.id
                    ],
                )?;
            } else if classification.strong {
                connection.execute(
                    "UPDATE projects
                     SET version_kind = ?1, version_confidence = 'high',
                         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     WHERE id = ?2 AND parent_project_id IS NULL",
                    params![classification.kind, candidate.id],
                )?;
            }
        }
        Ok(())
    }

    pub fn list(connection: &Connection, project_id: i64) -> AppResult<ProjectVersionSet> {
        let root_id = root_id(connection, project_id)?;
        let primary = item(connection, root_id)?;
        let mut statement = connection.prepare(
            "SELECT id, original_name, file_path, version_kind, version_confidence,
                    file_size, file_modified_at, is_missing
             FROM projects
             WHERE parent_project_id = ?1
             ORDER BY CASE version_confidence WHEN 'suggested' THEN 1 ELSE 0 END,
                      file_modified_at DESC, id DESC",
        )?;
        let versions = statement
            .query_map([root_id], map_item)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(ProjectVersionSet {
            project_id: root_id,
            primary,
            versions,
        })
    }

    pub fn confirm(
        connection: &Connection,
        project_id: i64,
        version_id: i64,
    ) -> AppResult<()> {
        let root = root_id(connection, project_id)?;
        changed(connection.execute(
            "UPDATE projects
             SET version_confidence = 'confirmed',
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1 AND parent_project_id = ?2",
            params![version_id, root],
        )?)
    }

    pub fn detach(
        connection: &Connection,
        project_id: i64,
        version_id: i64,
    ) -> AppResult<()> {
        let root = root_id(connection, project_id)?;
        changed(connection.execute(
            "UPDATE projects
             SET parent_project_id = NULL, version_kind = 'primary', version_confidence = 'rejected',
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1 AND parent_project_id = ?2",
            params![version_id, root],
        )?)
    }

    pub fn promote(
        connection: &mut Connection,
        project_id: i64,
        version_id: i64,
    ) -> AppResult<()> {
        let root = root_id(connection, project_id)?;
        if root == version_id {
            return Ok(());
        }
        let transaction = connection.transaction()?;
        let child: Option<PhysicalProject> = transaction
            .query_row(
                "SELECT file_path, original_name, file_size, file_created_at,
                        file_modified_at, is_missing
                 FROM projects WHERE id = ?1 AND parent_project_id = ?2",
                params![version_id, root],
                map_physical,
            )
            .optional()?;
        let child = child.ok_or(AppError::ProjectNotFound)?;
        let main = transaction.query_row(
            "SELECT file_path, original_name, file_size, file_created_at,
                    file_modified_at, is_missing
             FROM projects WHERE id = ?1",
            [root],
            map_physical,
        )?;

        let temporary = format!("__chilli_version_swap_{root}_{version_id}");
        transaction.execute(
            "UPDATE projects SET file_path = ?1 WHERE id = ?2",
            params![temporary, root],
        )?;
        update_physical(&transaction, version_id, &main)?;
        update_physical(&transaction, root, &child)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn version_path(
        connection: &Connection,
        project_id: i64,
        version_id: i64,
    ) -> AppResult<String> {
        let root = root_id(connection, project_id)?;
        connection
            .query_row(
                "SELECT file_path FROM projects
                 WHERE id = ?1 AND (id = ?2 OR parent_project_id = ?2)",
                params![version_id, root],
                |row| row.get(0),
            )
            .optional()?
            .ok_or(AppError::ProjectNotFound)
    }
}

#[derive(Debug)]
struct Candidate {
    id: i64,
    name: String,
    path: String,
    extension: String,
    daw: String,
}

struct Marker {
    base: String,
    kind: &'static str,
    strong: bool,
}

struct PhysicalProject {
    file_path: String,
    original_name: String,
    file_size: i64,
    file_created_at: Option<String>,
    file_modified_at: Option<String>,
    is_missing: i64,
}

fn marker(candidate: &Candidate) -> Option<Marker> {
    let stem = Path::new(&candidate.name)
        .file_stem()?
        .to_string_lossy()
        .to_lowercase();
    let path_strong = PathBuf::from(&candidate.path).components().any(|part| {
        let value = part.as_os_str().to_string_lossy().to_lowercase();
        matches!(
            value.as_str(),
            "backup" | "backups" | "autosave" | "autosaves" | "recovery"
        )
    });

    for (needle, kind) in [
        ("(overwritten at", "backup"),
        (" overwritten at", "backup"),
        (" - backup", "backup"),
        ("_backup", "backup"),
        (" backup", "backup"),
        ("(autosaved at", "backup"),
        (" autosaved at", "backup"),
        ("(auto-saved at", "backup"),
        (" auto-saved at", "backup"),
        (" - autosaved", "backup"),
        ("_autosaved", "backup"),
        (" - autosave", "backup"),
        ("_autosave", "backup"),
        (" - copy", "copy"),
        ("_copy", "copy"),
        (" (copy", "copy"),
    ] {
        if let Some(index) = stem.find(needle) {
            let base = clean_base(&stem[..index]);
            if !base.is_empty() {
                return Some(Marker {
                    base,
                    kind,
                    strong: true,
                });
            }
        }
    }
    if let Some(base) = version_base(&stem) {
        return Some(Marker {
            base,
            kind: "version",
            strong: path_strong,
        });
    }
    path_strong.then(|| Marker {
        base: clean_base(&stem),
        kind: "backup",
        strong: true,
    })
}

fn normalized_stem(name: &str) -> String {
    Path::new(name)
        .file_stem()
        .map(|value| clean_base(&value.to_string_lossy().to_lowercase()))
        .unwrap_or_default()
}

fn version_base(stem: &str) -> Option<String> {
    for separator in [" v", "_v", "-v"] {
        if let Some(index) = stem.rfind(separator) {
            let suffix = stem[index + separator.len()..].trim();
            if !suffix.is_empty() && suffix.chars().all(|value| value.is_ascii_digit()) {
                let base = clean_base(&stem[..index]);
                if !base.is_empty() {
                    return Some(base);
                }
            }
        }
    }
    None
}

fn clean_base(value: &str) -> String {
    value
        .trim_matches(|character: char| {
            character.is_whitespace() || matches!(character, '-' | '_' | '(' | ')')
        })
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn root_id(connection: &Connection, project_id: i64) -> AppResult<i64> {
    connection
        .query_row(
            "SELECT COALESCE(parent_project_id, id) FROM projects WHERE id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(AppError::ProjectNotFound)
}

fn item(connection: &Connection, id: i64) -> AppResult<ProjectVersionItem> {
    connection
        .query_row(
            "SELECT id, original_name, file_path, version_kind, version_confidence,
                    file_size, file_modified_at, is_missing
             FROM projects WHERE id = ?1",
            [id],
            map_item,
        )
        .optional()?
        .ok_or(AppError::ProjectNotFound)
}

fn map_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectVersionItem> {
    Ok(ProjectVersionItem {
        id: row.get(0)?,
        file_name: row.get(1)?,
        file_path: row.get(2)?,
        kind: row.get(3)?,
        confidence: row.get(4)?,
        file_size: row.get(5)?,
        file_modified_at: row.get(6)?,
        is_missing: row.get::<_, i64>(7)? != 0,
    })
}

fn map_physical(row: &rusqlite::Row<'_>) -> rusqlite::Result<PhysicalProject> {
    Ok(PhysicalProject {
        file_path: row.get(0)?,
        original_name: row.get(1)?,
        file_size: row.get(2)?,
        file_created_at: row.get(3)?,
        file_modified_at: row.get(4)?,
        is_missing: row.get(5)?,
    })
}

fn update_physical(
    connection: &Connection,
    project_id: i64,
    source: &PhysicalProject,
) -> AppResult<()> {
    connection.execute(
        "UPDATE projects
         SET file_path = ?1, original_name = ?2, file_size = ?3,
             file_created_at = ?4, file_modified_at = ?5, is_missing = ?6,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?7",
        params![
            source.file_path,
            source.original_name,
            source.file_size,
            source.file_created_at,
            source.file_modified_at,
            source.is_missing,
            project_id
        ],
    )?;
    Ok(())
}

fn changed(count: usize) -> AppResult<()> {
    if count == 0 {
        Err(AppError::ProjectNotFound)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{configure_connection, migrations};

    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("database");
        configure_connection(&connection).expect("configure");
        migrations::run(&mut connection).expect("migrate");
        connection
    }

    #[test]
    fn groups_explicit_backup_but_only_suggests_numbered_versions() {
        let connection = database();
        for (name, path) in [
            ("Beat.flp", "C:/Music/Beat.flp"),
            (
                "Beat (overwritten at 16h09).flp",
                "C:/Music/Beat (overwritten at 16h09).flp",
            ),
            ("Beat v2.flp", "C:/Music/Beat v2.flp"),
        ] {
            connection.execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw)
                 VALUES (?1, ?1, ?2, '.flp', 'FL Studio')",
                params![name, path],
            ).expect("project");
        }

        ProjectVersionRepository::classify_discovered(&connection).expect("classify");
        let set = ProjectVersionRepository::list(&connection, 1).expect("versions");

        assert_eq!(set.versions.len(), 2);
        assert_eq!(set.versions[0].confidence.as_deref(), Some("high"));
        assert_eq!(set.versions[1].confidence.as_deref(), Some("suggested"));
    }

    #[test]
    fn groups_fl_studio_autosaved_files_under_the_primary_project() {
        let connection = database();
        for (name, path) in [
            ("The Money.flp", "C:/Music/The Money.flp"),
            (
                "The Money (autosaved at 10h05).flp",
                "C:/Music/The Money (autosaved at 10h05).flp",
            ),
            (
                "The Money (autosaved at 9h31).flp",
                "C:/Music/The Money (autosaved at 9h31).flp",
            ),
        ] {
            connection
                .execute(
                    "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw)
                 VALUES (?1, ?1, ?2, '.flp', 'FL Studio')",
                    params![name, path],
                )
                .expect("project");
        }

        ProjectVersionRepository::classify_discovered(&connection).expect("classify");
        let set = ProjectVersionRepository::list(&connection, 1).expect("versions");
        let visible_roots: i64 = connection.query_row(
            "SELECT COUNT(*) FROM projects WHERE parent_project_id IS NULL",
            [],
            |row| row.get(0),
        ).expect("visible roots");

        assert_eq!(visible_roots, 1);
        assert_eq!(set.versions.len(), 2);
        assert!(set.versions.iter().all(|version| version.kind == "backup"));
        assert!(set.versions.iter().all(|version| version.confidence.as_deref() == Some("high")));
    }

    #[test]
    fn hides_orphan_autosaves_and_links_them_when_the_primary_appears() {
        let connection = database();
        for name in [
            "Untitled (autosaved at 22h29).flp",
            "Untitled (autosaved at 23h18).flp",
        ] {
            connection
                .execute(
                    "INSERT INTO projects
                     (display_name, original_name, file_path, extension, daw)
                     VALUES (?1, ?1, ?2, '.flp', 'FL Studio')",
                    params![name, format!("C:/Music/{name}")],
                )
                .expect("autosave");
        }

        ProjectVersionRepository::classify_discovered(&connection).expect("classify orphans");
        let visible: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM projects
                 WHERE parent_project_id IS NULL AND version_kind = 'primary'",
                [],
                |row| row.get(0),
            )
            .expect("visible projects");
        assert_eq!(visible, 0);

        connection
            .execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw)
                 VALUES ('Untitled', 'Untitled.flp', 'C:/Music/Untitled.flp',
                         '.flp', 'FL Studio')",
                [],
            )
            .expect("primary");
        ProjectVersionRepository::classify_discovered(&connection).expect("link orphans");

        let set = ProjectVersionRepository::list(&connection, 3).expect("versions");
        assert_eq!(set.versions.len(), 2);
        assert!(set.versions.iter().all(|version| version.kind == "backup"));
    }

    #[test]
    fn promotion_keeps_the_project_identity() {
        let mut connection = database();
        connection.execute(
            "INSERT INTO projects
             (display_name, original_name, file_path, extension, daw)
             VALUES ('Beat', 'Beat.flp', 'C:/Beat.flp', '.flp', 'FL Studio')",
            [],
        ).expect("main");
        connection.execute(
            "INSERT INTO projects
             (display_name, original_name, file_path, extension, daw,
              parent_project_id, version_kind, version_confidence)
             VALUES ('Backup', 'Beat backup.flp', 'C:/Beat backup.flp', '.flp',
                     'FL Studio', 1, 'backup', 'confirmed')",
            [],
        ).expect("backup");

        ProjectVersionRepository::promote(&mut connection, 1, 2).expect("promote");
        let set = ProjectVersionRepository::list(&connection, 1).expect("versions");

        assert_eq!(set.project_id, 1);
        assert_eq!(set.primary.file_name, "Beat backup.flp");
        assert_eq!(set.versions[0].file_name, "Beat.flp");
    }
}

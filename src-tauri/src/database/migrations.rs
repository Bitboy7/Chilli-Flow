use rusqlite::{params, Connection};

use crate::errors::AppResult;

const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("migrations/0001_initial.sql")),
    (2, include_str!("migrations/0002_library_indexes.sql")),
    (3, include_str!("migrations/0003_scan_history_metrics.sql")),
    (4, include_str!("migrations/0004_project_folder_paths.sql")),
    (5, include_str!("migrations/0005_audio_analysis.sql")),
    (6, include_str!("migrations/0006_finish_mode.sql")),
    (7, include_str!("migrations/0007_project_versions.sql")),
    (8, include_str!("migrations/0008_managed_workspaces.sql")),
    (9, include_str!("migrations/0009_universal_handoff.sql")),
        (10, include_str!("migrations/0010_project_file_discovery.sql")),
    (11, include_str!("migrations/0011_audio_tempo_key.sql")),
];

pub fn run(connection: &mut Connection) -> AppResult<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );",
    )?;

    let current_version = connection.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get::<_, i64>(0),
    )?;

    for (version, sql) in MIGRATIONS
        .iter()
        .filter(|(version, _)| *version > current_version)
    {
        let transaction = connection.transaction()?;
        transaction.execute_batch(sql)?;
        transaction.execute(
            "INSERT INTO schema_migrations (version) VALUES (?1)",
            params![version],
        )?;
        transaction.commit()?;
    }

    Ok(())
}

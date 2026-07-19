use rusqlite::{params, Connection};

use crate::{errors::AppResult, models::{ScanHistoryEntry, ScanHistoryPage}};

#[derive(Debug, Default)]
pub struct ScanHistoryMetrics {
    pub files_scanned: u64,
    pub projects_found: u64,
    pub projects_created: u64,
    pub projects_updated: u64,
    pub projects_moved: u64,
    pub projects_marked_missing: u64,
    pub unreadable_entries: u64,
}

pub struct ScanHistoryRepository;

impl ScanHistoryRepository {
    pub fn start(connection: &Connection, folder_path: &str) -> AppResult<i64> {
        connection.execute(
            "INSERT INTO scan_history (folder_path, started_at, status)
             VALUES (?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'running')",
            params![folder_path],
        )?;
        Ok(connection.last_insert_rowid())
    }

    pub fn finish(
        connection: &Connection,
        scan_history_id: i64,
        status: &str,
        metrics: &ScanHistoryMetrics,
        error_message: Option<&str>,
    ) -> AppResult<()> {
        connection.execute(
            "UPDATE scan_history
             SET finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                 files_scanned = ?1,
                 projects_found = ?2,
                 projects_created = ?3,
                 projects_updated = ?4,
                 projects_moved = ?5,
                 projects_marked_missing = ?6,
                 unreadable_entries = ?7,
                 status = ?8,
                 error_message = ?9
             WHERE id = ?10",
            params![
                as_i64(metrics.files_scanned),
                as_i64(metrics.projects_found),
                as_i64(metrics.projects_created),
                as_i64(metrics.projects_updated),
                as_i64(metrics.projects_moved),
                as_i64(metrics.projects_marked_missing),
                as_i64(metrics.unreadable_entries),
                status,
                error_message,
                scan_history_id
            ],
        )?;
        Ok(())
    }

    pub fn page(connection: &Connection, page: u32, page_size: u32) -> AppResult<ScanHistoryPage> {
        let page_size = page_size.clamp(1, 100);
        let total: i64 = connection.query_row("SELECT COUNT(*) FROM scan_history", [], |row| row.get(0))?;
        let total_pages = if total == 0 { 0 } else { ((total as u64 + page_size as u64 - 1) / page_size as u64) as u32 };
        let page = if total_pages == 0 { 1 } else { page.max(1).min(total_pages) };
        let offset = i64::from(page.saturating_sub(1)) * i64::from(page_size);
        let mut statement = connection.prepare(
            "SELECT id, folder_path, started_at, finished_at, files_scanned,
                    projects_found, projects_created, projects_updated,
                    projects_moved, projects_marked_missing, unreadable_entries,
                    status, error_message
             FROM scan_history ORDER BY started_at DESC, id DESC LIMIT ?1 OFFSET ?2",
        )?;
        let items = statement.query_map(params![page_size, offset], |row| Ok(ScanHistoryEntry {
            id: row.get(0)?, folder_path: row.get(1)?, started_at: row.get(2)?,
            finished_at: row.get(3)?, files_scanned: row.get(4)?, projects_found: row.get(5)?,
            projects_created: row.get(6)?, projects_updated: row.get(7)?, projects_moved: row.get(8)?,
            projects_marked_missing: row.get(9)?, unreadable_entries: row.get(10)?,
            status: row.get(11)?, error_message: row.get(12)?,
        }))?.collect::<Result<Vec<_>, _>>()?;
        Ok(ScanHistoryPage { items, total, page, page_size, total_pages })
    }
}

fn as_i64(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use crate::database::{configure_connection, migrations};
    use super::*;

    #[test]
    fn history_is_paginated_newest_first_with_phase_six_metrics() {
        let mut connection = Connection::open_in_memory().expect("database");
        configure_connection(&connection).expect("configure");
        migrations::run(&mut connection).expect("migrate");
        for index in 0..3 {
            let id = ScanHistoryRepository::start(&connection, &format!("C:/Music/{index}"))
                .expect("start");
            ScanHistoryRepository::finish(&connection, id, "completed", &ScanHistoryMetrics {
                projects_moved: index, projects_marked_missing: index + 1,
                ..ScanHistoryMetrics::default()
            }, None).expect("finish");
        }
        let page = ScanHistoryRepository::page(&connection, 1, 2).expect("page");
        assert_eq!(page.total, 3);
        assert_eq!(page.total_pages, 2);
        assert_eq!(page.items.len(), 2);
        assert_eq!(page.items[0].folder_path, "C:/Music/2");
        assert_eq!(page.items[0].projects_moved, 2);
        assert_eq!(page.items[0].projects_marked_missing, 3);
    }
}

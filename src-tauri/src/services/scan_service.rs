use std::{
    collections::HashSet,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use tauri::{AppHandle, Emitter, Manager};

use crate::{
    errors::{AppError, AppResult},
    models::{ScanFinished, ScanProgress, ScanSession, WatchedFolder},
    platform::canonicalize_directory,
    repositories::{
        CustomExtensionRepository, ProjectRepository, ProjectVersionRepository, ScanHistoryMetrics, ScanHistoryRepository,
        WatchedFolderRepository,
    },
    scanner::{scan_directory, DawCatalog},
    state::AppState,
};

pub const SCAN_PROGRESS_EVENT: &str = "scan://progress";
pub const SCAN_FINISHED_EVENT: &str = "scan://finished";

pub struct ScanService;

impl ScanService {
    pub fn start(
        app: &AppHandle,
        state: &AppState,
        folder_id: Option<i64>,
    ) -> AppResult<ScanSession> {
        let (folders, catalog) = {
            let connection = state.database().connection()?;
            let folders = WatchedFolderRepository::scan_targets(&connection, folder_id)?;
            if folders.is_empty() {
                return Err(AppError::NoEnabledFolders);
            }
            let custom_extensions = CustomExtensionRepository::enabled(&connection)?
                .into_iter()
                .map(|item| (item.extension, item.daw_name));
            (folders, DawCatalog::new(custom_extensions))
        };

        let (session_id, cancellation) = state.scans().begin()?;
        let folder_count = folders.len();
        let app_handle = app.clone();

        tauri::async_runtime::spawn_blocking(move || {
            let finished = run_session(
                &app_handle,
                session_id,
                folders,
                catalog,
                Arc::clone(&cancellation),
            )
            .unwrap_or_else(|error| ScanFinished {
                session_id,
                status: "failed".to_string(),
                files_scanned: 0,
                projects_found: 0,
                projects_created: 0,
                projects_updated: 0,
                projects_moved: 0,
                projects_marked_missing: 0,
                error_message: Some(error.to_string()),
            });

            app_handle
                .state::<AppState>()
                .scans()
                .finish(session_id);
            let _ = app_handle.emit(SCAN_FINISHED_EVENT, finished);
        });

        Ok(ScanSession {
            session_id,
            folder_count,
        })
    }

    pub fn cancel(state: &AppState, session_id: u64) -> AppResult<()> {
        state.scans().cancel(session_id)
    }
}

fn run_session(
    app: &AppHandle,
    session_id: u64,
    folders: Vec<WatchedFolder>,
    catalog: DawCatalog,
    cancellation: Arc<AtomicBool>,
) -> AppResult<ScanFinished> {
    let mut final_event = ScanFinished {
        session_id,
        status: "completed".to_string(),
        files_scanned: 0,
        projects_found: 0,
        projects_created: 0,
        projects_updated: 0,
        projects_moved: 0,
        projects_marked_missing: 0,
        error_message: None,
    };

    for folder in folders {
        if cancellation.load(Ordering::Relaxed) {
            final_event.status = "cancelled".to_string();
            break;
        }

        let history_id = {
            let state = app.state::<AppState>();
            let connection = state.database().connection()?;
            ScanHistoryRepository::start(&connection, &folder.folder_path)?
        };

        let folder_path = folder.folder_path.clone();
        let canonical_folder = match canonicalize_directory(&folder_path) {
            Ok(path) => path,
            Err(error) => {
                let message = error.to_string();
                let state = app.state::<AppState>();
                let connection = state.database().connection()?;
                ScanHistoryRepository::finish(
                    &connection,
                    history_id,
                    "failed",
                    &ScanHistoryMetrics::default(),
                    Some(&message),
                )?;
                final_event.status = "failed".to_string();
                final_event.error_message = Some(message);
                continue;
            }
        };
        let outcome = scan_directory(
            &canonical_folder,
            &catalog,
            cancellation.as_ref(),
            |files_scanned, projects_found, unreadable_entries| {
                let _ = app.emit(
                    SCAN_PROGRESS_EVENT,
                    ScanProgress {
                        session_id,
                        folder_id: folder.id,
                        folder_path: folder_path.clone(),
                        files_scanned,
                        projects_found,
                        unreadable_entries,
                    },
                );
            },
        );

        let was_cancelled =
            outcome.was_cancelled || cancellation.load(Ordering::Relaxed);
        let can_reconcile = can_reconcile_scan(was_cancelled);
        let warning = (outcome.unreadable_entries > 0).then(|| {
            format!(
                "{} elementos no se pudieron leer",
                outcome.unreadable_entries
            )
        });
        let discovered_paths = outcome
            .projects
            .iter()
            .map(|project| project.file_path.clone())
            .collect::<HashSet<_>>();

        final_event.files_scanned += outcome.files_scanned;
        final_event.projects_found += outcome.projects_found();

        let persistence = || -> AppResult<_> {
            let state = app.state::<AppState>();
            let mut connection = state.database().connection()?;
            let moved = if can_reconcile && outcome.unreadable_entries == 0 {
                ProjectRepository::reconcile_moved_in_folder(
                    &mut connection, &canonical_folder, &outcome.projects, &discovered_paths,
                )?
            } else { 0 };
            let upsert = ProjectRepository::upsert_batch(&mut connection, &outcome.projects)?;
            ProjectVersionRepository::classify_discovered(&connection)?;
            let marked_missing = if can_reconcile {
                ProjectRepository::mark_missing_in_folder(
                    &mut connection,
                    &canonical_folder,
                    &discovered_paths,
                    &outcome.unreadable_paths,
                )?
            } else { 0 };
            if !was_cancelled {
                WatchedFolderRepository::touch_scanned(&connection, folder.id)?;
            }
            ScanHistoryRepository::finish(
                &connection,
                history_id,
                if was_cancelled {
                    "cancelled"
                } else {
                    "completed"
                },
                &ScanHistoryMetrics {
                    files_scanned: outcome.files_scanned,
                    projects_found: outcome.projects_found(),
                    projects_created: upsert.created,
                    projects_updated: upsert.updated,
                    projects_moved: moved,
                    projects_marked_missing: marked_missing,
                    unreadable_entries: outcome.unreadable_entries,
                },
                warning.as_deref(),
            )?;
            Ok((upsert, moved, marked_missing))
        };
        let (upsert, moved, marked_missing) = match persistence() {
            Ok(result) => result,
            Err(error) => {
                let message = error.to_string();
                let state = app.state::<AppState>();
                if let Ok(connection) = state.database().connection() {
                    let _ = ScanHistoryRepository::finish(
                        &connection,
                        history_id,
                        "failed",
                        &ScanHistoryMetrics {
                            files_scanned: outcome.files_scanned,
                            projects_found: outcome.projects_found(),
                            unreadable_entries: outcome.unreadable_entries,
                            ..ScanHistoryMetrics::default()
                        },
                        Some(&message),
                    );
                }
                final_event.status = "failed".to_string();
                final_event.error_message = Some(message);
                continue;
            }
        };

        final_event.projects_created += upsert.created;
        final_event.projects_updated += upsert.updated;
        final_event.projects_moved += moved;
        final_event.projects_marked_missing += marked_missing;
        if warning.is_some() {
            final_event.error_message = warning;
        }

        if was_cancelled {
            final_event.status = "cancelled".to_string();
            break;
        }
    }

    Ok(final_event)
}

fn can_reconcile_scan(was_cancelled: bool) -> bool {
    !was_cancelled
}

#[cfg(test)]
mod tests {
    use super::can_reconcile_scan;

    #[test]
    fn reconciles_only_after_a_complete_walk() {
        assert!(can_reconcile_scan(false));
        assert!(!can_reconcile_scan(true));
    }
}

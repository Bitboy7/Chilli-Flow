use std::{
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use walkdir::WalkDir;

use crate::models::DiscoveredProject;

use super::DawCatalog;

const PROGRESS_INTERVAL: u64 = 250;

#[derive(Debug)]
pub struct ScanOutcome {
    pub projects: Vec<DiscoveredProject>,
    pub files_scanned: u64,
    pub unreadable_entries: u64,
    pub unreadable_paths: Vec<PathBuf>,
    pub was_cancelled: bool,
}

impl ScanOutcome {
    pub fn projects_found(&self) -> u64 {
        self.projects.len() as u64
    }
}

pub fn scan_directory<F>(
    root: &Path,
    catalog: &DawCatalog,
    cancellation: &AtomicBool,
    mut report_progress: F,
) -> ScanOutcome
where
    F: FnMut(u64, u64, u64),
{
    let mut projects = Vec::new();
    let mut files_scanned = 0_u64;
    let mut unreadable_entries = 0_u64;
    let mut unreadable_paths = Vec::new();
    let mut walker = WalkDir::new(root).follow_links(false).into_iter();

    while let Some(entry_result) = walker.next() {
        if cancellation.load(Ordering::Relaxed) {
            return ScanOutcome {
                projects,
                files_scanned,
                unreadable_entries,
                unreadable_paths,
                was_cancelled: true,
            };
        }

        let entry = match entry_result {
            Ok(entry) => entry,
            Err(error) => {
                unreadable_entries += 1;
                unreadable_paths.push(error.path().unwrap_or(root).to_path_buf());
                continue;
            }
        };

        if entry.depth() == 0 {
            continue;
        }

        let is_directory = entry.file_type().is_dir();
        if !is_directory {
            files_scanned += 1;
        }

        if let Some(format) = catalog.detect(entry.path()) {
            if let Some(project) =
                discovered_project(entry.path(), is_directory, format.extension, format.daw_name)
            {
                projects.push(project);
            }

            if is_directory {
                walker.skip_current_dir();
            }
        }

        if files_scanned > 0 && files_scanned % PROGRESS_INTERVAL == 0 {
            report_progress(
                files_scanned,
                projects.len() as u64,
                unreadable_entries,
            );
        }
    }

    report_progress(
        files_scanned,
        projects.len() as u64,
        unreadable_entries,
    );

    ScanOutcome {
        projects,
        files_scanned,
        unreadable_entries,
        unreadable_paths,
        was_cancelled: false,
    }
}

fn discovered_project(
    path: &Path,
    is_directory: bool,
    extension: String,
    daw: String,
) -> Option<DiscoveredProject> {
    let metadata = path.metadata().ok()?;
    let original_name = path.file_name()?.to_string_lossy().into_owned();
    let display_name = path.file_stem()?.to_string_lossy().into_owned();

    Some(DiscoveredProject {
        display_name,
        original_name,
        file_path: path.to_string_lossy().into_owned(),
        extension,
        daw,
        file_size: if is_directory { 0 } else { metadata.len() },
        file_created_at: metadata.created().ok().and_then(unix_seconds),
        file_modified_at: metadata.modified().ok().and_then(unix_seconds),
    })
}

fn unix_seconds(value: SystemTime) -> Option<f64> {
    value
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs_f64())
}

#[cfg(test)]
mod tests {
    use std::{fs, sync::atomic::AtomicBool};

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn scans_nested_projects_and_project_packages() {
        let directory = tempdir().expect("temporary directory");
        let nested = directory.path().join("Artist").join("Album");
        fs::create_dir_all(&nested).expect("nested directory");
        fs::write(nested.join("Beat.FLP"), b"project").expect("FL Studio project");
        fs::write(nested.join("preview.wav"), b"audio").expect("audio file");
        fs::create_dir(nested.join("Mobile.band")).expect("GarageBand package");
        fs::write(
            nested.join("Mobile.band").join("internal.flp"),
            b"must be skipped",
        )
        .expect("package content");

        let outcome = scan_directory(
            directory.path(),
            &DawCatalog::new([]),
            &AtomicBool::new(false),
            |_, _, _| {},
        );

        assert_eq!(outcome.projects_found(), 2);
        assert!(outcome
            .projects
            .iter()
            .any(|project| project.extension == ".flp"));
        assert!(outcome
            .projects
            .iter()
            .any(|project| project.extension == ".band"));
        assert!(!outcome.was_cancelled);
    }

    #[test]
    fn stops_before_walking_when_cancelled() {
        let directory = tempdir().expect("temporary directory");
        fs::write(directory.path().join("Beat.rpp"), b"project").expect("project");
        let cancellation = AtomicBool::new(true);

        let outcome = scan_directory(
            directory.path(),
            &DawCatalog::new([]),
            &cancellation,
            |_, _, _| {},
        );

        assert!(outcome.was_cancelled);
        assert_eq!(outcome.projects_found(), 0);
    }
}

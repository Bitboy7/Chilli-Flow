use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    errors::{AppError, AppResult},
    models::{
        FolderSetupItem, FolderSetupMethod, FolderSetupPlan, ProjectDetail, ProjectFolderCategory,
    },
    repositories::ProjectDetailRepository,
    scanner::KNOWN_DAWS,
    services::ProjectDetailService,
    state::AppState,
};

pub struct FolderSetupService;

impl FolderSetupService {
    pub fn preview(
        state: &AppState,
        project_id: i64,
        method: FolderSetupMethod,
    ) -> AppResult<FolderSetupPlan> {
        let path = super::project_detail_service::authorized_existing_project(state, project_id)?;
        let detail = ProjectDetailService::get(state, project_id)?;
        state
            .folder_plans()
            .store(build_plan(&detail, &path, method)?)
    }

    pub fn apply(state: &AppState, project_id: i64, token: u64) -> AppResult<ProjectDetail> {
        let plan = state.folder_plans().take(token)?;
        if plan.project_id != project_id {
            return Err(AppError::FolderPlanNotFound);
        }
        let path = super::project_detail_service::authorized_existing_project(state, project_id)?;
        let detail = ProjectDetailService::get(state, project_id)?;
        let fresh = build_plan(&detail, &path, plan.method)?;
        if !same_plan(&plan, &fresh) {
            return Err(AppError::FolderPlanNotFound);
        }

        let source = PathBuf::from(&plan.source_path);
        let target = PathBuf::from(&plan.target_project_path);
        let root = PathBuf::from(&plan.root_path);
        let parent = source
            .parent()
            .ok_or_else(|| AppError::InvalidProject("archivo sin carpeta padre".into()))?;
        if !root.starts_with(parent) {
            return Err(AppError::InvalidPath(
                "raíz propuesta fuera de la carpeta supervisada".into(),
            ));
        }
        if plan.will_relocate_project
            && (target.parent() != Some(root.as_path()) || target.exists())
        {
            return Err(AppError::InvalidProject(
                "el destino dejó de estar disponible".into(),
            ));
        }

        let folders = plan
            .items
            .iter()
            .map(|item| Ok((category(&item.category)?, item.path.as_str())))
            .collect::<AppResult<Vec<_>>>()?;
        let root_existed = root.exists();
        let item_existed = plan
            .items
            .iter()
            .map(|item| Path::new(&item.path).is_dir())
            .collect::<Vec<_>>();
        for item in &plan.items {
            let folder = PathBuf::from(&item.path);
            if !folder.starts_with(&root) {
                return Err(AppError::InvalidPath("carpeta fuera del plan".into()));
            }
            if let Err(error) = fs::create_dir_all(folder) {
                cleanup_directories(&root, root_existed, &plan.items, &item_existed);
                return Err(AppError::FileOperation(error));
            }
        }
        if plan.will_relocate_project {
            if let Err(error) = relocate_project(plan.method, &source, &target) {
                cleanup_directories(&root, root_existed, &plan.items, &item_existed);
                return Err(error);
            }
        }

        let target_update = plan
            .will_relocate_project
            .then_some(plan.target_project_path.as_str());
        let retained = (plan.will_relocate_project && plan.method == FolderSetupMethod::Copy)
            .then_some(plan.source_path.as_str());
        let database_result = state.database().connection().and_then(|mut connection| {
            ProjectDetailRepository::apply_folder_setup(
                &mut connection,
                project_id,
                target_update,
                retained,
                &folders,
            )
        });
        if let Err(error) = database_result {
            if let Err(rollback) =
                rollback_project(plan.method, &source, &target, plan.will_relocate_project)
            {
                return Err(AppError::InvalidProject(format!(
                    "no se actualizó el registro ({error}) y tampoco se pudo revertir el archivo ({rollback})"
                )));
            }
            cleanup_directories(&root, root_existed, &plan.items, &item_existed);
            return Err(error);
        }
        ProjectDetailService::get(state, project_id)
    }
}

fn build_plan(
    detail: &ProjectDetail,
    project_path: &Path,
    method: FolderSetupMethod,
) -> AppResult<FolderSetupPlan> {
    let source = dunce::canonicalize(project_path).map_err(AppError::FileOperation)?;
    let parent = source.parent().unwrap_or(source.as_path());
    let stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Project");
    let dedicated = detail.workspace_root.is_some() || is_dedicated_root(parent, stem)?;
    let root = if source.is_dir() {
        source.clone()
    } else if dedicated {
        parent.to_path_buf()
    } else {
        parent.join(safe_directory_name(stem))
    };
    if !dedicated && root.exists() && directory_has_project_file(&root)? {
        return Err(AppError::InvalidProject(
            "la carpeta individual propuesta ya contiene otro archivo de proyecto".into(),
        ));
    }
    let relocate = !dedicated && method != FolderSetupMethod::FoldersOnly && source.is_file();
    let target = if relocate {
        root.join(
            source
                .file_name()
                .ok_or_else(|| AppError::InvalidProject("archivo sin nombre".into()))?,
        )
    } else {
        source.clone()
    };
    let folders = proposed_folders(&root, &detail.daw);
    Ok(FolderSetupPlan {
        token: 0,
        project_id: detail.id,
        daw: detail.daw.clone(),
        method,
        source_path: source.to_string_lossy().into_owned(),
        target_project_path: target.to_string_lossy().into_owned(),
        will_relocate_project: relocate,
        root_exists: root.is_dir(),
        root_path: root.to_string_lossy().into_owned(),
        items: folders
            .into_iter()
            .map(|(category, path)| FolderSetupItem {
                category: category.into(),
                exists: path.is_dir(),
                path: path.to_string_lossy().into_owned(),
            })
            .collect(),
    })
}

fn proposed_folders(root: &Path, daw: &str) -> [(&'static str, PathBuf); 4] {
    let daw = daw.to_ascii_lowercase();
    if daw.contains("fl studio") {
        [
            ("stems", root.join("Renders/Stems")),
            ("mixes", root.join("Renders/Mixes")),
            ("masters", root.join("Renders/Masters")),
            ("references", root.join("References")),
        ]
    } else if daw.contains("ableton") {
        [
            ("stems", root.join("Exports/Stems")),
            ("mixes", root.join("Exports/Mixes")),
            ("masters", root.join("Exports/Masters")),
            ("references", root.join("References")),
        ]
    } else if daw.contains("pro tools") {
        [
            ("stems", root.join("Bounced Files/Stems")),
            ("mixes", root.join("Bounced Files/Mixes")),
            ("masters", root.join("Bounced Files/Masters")),
            ("references", root.join("Reference Tracks")),
        ]
    } else {
        [
            ("stems", root.join("Stems")),
            ("mixes", root.join("Mixes")),
            ("masters", root.join("Masters")),
            ("references", root.join("References")),
        ]
    }
}

fn is_dedicated_root(parent: &Path, stem: &str) -> AppResult<bool> {
    let parent_name = parent
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    if normalize_name(parent_name) == normalize_name(stem) {
        return Ok(true);
    }
    let has_structure = [
        "Renders",
        "Exports",
        "Bounced Files",
        "Audio",
        "References",
        "Project Info.json",
    ]
    .iter()
    .any(|name| parent.join(name).exists());
    Ok(has_structure && project_file_count(parent)? <= 1)
}

fn normalize_name(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn safe_directory_name(stem: &str) -> String {
    let value = stem.trim().trim_end_matches(['.', ' ']);
    if value.is_empty() {
        "Project".into()
    } else {
        value.into()
    }
}

fn directory_has_project_file(path: &Path) -> AppResult<bool> {
    Ok(project_file_count(path)? > 0)
}

fn project_file_count(path: &Path) -> AppResult<usize> {
    let mut count = 0;
    for entry in fs::read_dir(path).map_err(AppError::FileOperation)? {
        let entry = entry.map_err(AppError::FileOperation)?;
        if !entry
            .file_type()
            .map_err(AppError::FileOperation)?
            .is_file()
        {
            continue;
        }
        let extension = entry
            .path()
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| format!(".{}", value.to_ascii_lowercase()));
        if KNOWN_DAWS
            .iter()
            .any(|definition| Some(definition.extension) == extension.as_deref())
        {
            count += 1;
        }
    }
    Ok(count)
}

fn same_plan(left: &FolderSetupPlan, right: &FolderSetupPlan) -> bool {
    left.method == right.method
        && left.source_path == right.source_path
        && left.target_project_path == right.target_project_path
        && left.root_path == right.root_path
        && left.will_relocate_project == right.will_relocate_project
        && left
            .items
            .iter()
            .map(|item| &item.path)
            .eq(right.items.iter().map(|item| &item.path))
}

fn relocate_project(method: FolderSetupMethod, source: &Path, target: &Path) -> AppResult<()> {
    match method {
        FolderSetupMethod::Copy => {
            let copied = fs::copy(source, target).map_err(AppError::FileOperation)?;
            let expected = fs::metadata(source).map_err(AppError::FileOperation)?.len();
            if copied != expected {
                let _ = fs::remove_file(target);
                return Err(AppError::InvalidProject(
                    "la copia no coincide con el tamaño del original".into(),
                ));
            }
        }
        FolderSetupMethod::Move => fs::rename(source, target).map_err(AppError::FileOperation)?,
        FolderSetupMethod::FoldersOnly => {}
    }
    Ok(())
}

fn rollback_project(
    method: FolderSetupMethod,
    source: &Path,
    target: &Path,
    relocated: bool,
) -> std::io::Result<()> {
    if !relocated {
        return Ok(());
    }
    match method {
        FolderSetupMethod::Copy => {
            if target.exists() {
                fs::remove_file(target)
            } else {
                Ok(())
            }
        }
        FolderSetupMethod::Move => {
            if target.exists() {
                fs::rename(target, source)
            } else {
                Ok(())
            }
        }
        FolderSetupMethod::FoldersOnly => Ok(()),
    }
}

fn cleanup_directories(
    root: &Path,
    root_existed: bool,
    items: &[FolderSetupItem],
    item_existed: &[bool],
) {
    for (item, existed) in items.iter().zip(item_existed).rev() {
        if *existed {
            continue;
        }
        let mut current = PathBuf::from(&item.path);
        while current.starts_with(root) {
            if fs::remove_dir(&current).is_err() {
                break;
            }
            let Some(parent) = current.parent() else {
                break;
            };
            current = parent.to_path_buf();
        }
    }
    if !root_existed {
        let _ = fs::remove_dir(root);
    }
}

fn category(value: &str) -> AppResult<ProjectFolderCategory> {
    match value {
        "stems" => Ok(ProjectFolderCategory::Stems),
        "mixes" => Ok(ProjectFolderCategory::Mixes),
        "masters" => Ok(ProjectFolderCategory::Masters),
        "references" => Ok(ProjectFolderCategory::References),
        _ => Err(AppError::InvalidPath(
            "categoría de carpeta desconocida".into(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ProjectFolderPaths;

    fn detail(path: &Path) -> ProjectDetail {
        ProjectDetail {
            id: 1,
            display_name: "Demo".into(),
            original_name: "demo.flp".into(),
            file_path: path.to_string_lossy().into_owned(),
            extension: ".flp".into(),
            daw: "FL Studio".into(),
            cover_path: None,
            preview_path: None,
            bpm: None,
            musical_key: None,
            genre: None,
            status: "idea".into(),
            status_label: "Idea".into(),
            status_color: None,
            rating: None,
            notes: None,
            is_favorite: false,
            file_size: 7,
            file_created_at: None,
            file_modified_at: None,
            indexed_at: String::new(),
            updated_at: String::new(),
            is_missing: false,
            workspace_root: None,
            source_kind: "scanned".into(),
            tags: Vec::new(),
            folders: ProjectFolderPaths::default(),
        }
    }

    #[test]
    fn loose_project_gets_an_individual_copy_target() {
        let directory = tempfile::tempdir().expect("directory");
        let source = directory.path().join("demo.flp");
        fs::write(&source, b"project").expect("project");
        let plan = build_plan(&detail(&source), &source, FolderSetupMethod::Copy).expect("plan");
        assert_eq!(Path::new(&plan.root_path), directory.path().join("demo"));
        assert_eq!(
            Path::new(&plan.target_project_path),
            directory.path().join("demo/demo.flp")
        );
        assert!(plan.will_relocate_project);
    }

    #[test]
    fn shared_renders_do_not_make_a_multi_project_folder_dedicated() {
        let directory = tempfile::tempdir().expect("directory");
        fs::create_dir(directory.path().join("Renders")).expect("renders");
        let source = directory.path().join("demo.flp");
        fs::write(&source, b"project").expect("project");
        fs::write(directory.path().join("other.flp"), b"other").expect("other");
        let plan = build_plan(&detail(&source), &source, FolderSetupMethod::Copy).expect("plan");
        assert_eq!(Path::new(&plan.root_path), directory.path().join("demo"));
        assert!(plan.will_relocate_project);
    }

    #[test]
    fn matching_parent_is_reused_without_nested_folder() {
        let directory = tempfile::tempdir().expect("directory");
        let root = directory.path().join("demo");
        fs::create_dir(&root).expect("root");
        let source = root.join("demo.flp");
        fs::write(&source, b"project").expect("project");
        let plan = build_plan(&detail(&source), &source, FolderSetupMethod::Move).expect("plan");
        assert_eq!(Path::new(&plan.root_path), root);
        assert!(!plan.will_relocate_project);
    }

    #[test]
    fn folders_only_keeps_the_source_path() {
        let directory = tempfile::tempdir().expect("directory");
        let source = directory.path().join("demo.flp");
        fs::write(&source, b"project").expect("project");
        let plan =
            build_plan(&detail(&source), &source, FolderSetupMethod::FoldersOnly).expect("plan");
        assert_eq!(Path::new(&plan.target_project_path), source);
        assert!(!plan.will_relocate_project);
    }
}

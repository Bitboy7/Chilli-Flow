use std::{fs, path::{Path, PathBuf}};

use crate::{
    errors::{AppError, AppResult},
    models::{FolderSetupItem, FolderSetupPlan, ProjectDetail, ProjectFolderCategory},
    repositories::ProjectDetailRepository,
    services::ProjectDetailService,
    state::AppState,
};

pub struct FolderSetupService;

impl FolderSetupService {
    pub fn preview(state: &AppState, project_id: i64) -> AppResult<FolderSetupPlan> {
        let project_path = super::project_detail_service::authorized_existing_project(state, project_id)?;
        let detail = ProjectDetailService::get(state, project_id)?;
        state.folder_plans().store(build_plan(&detail, &project_path))
    }

    pub fn apply(state: &AppState, project_id: i64, token: u64) -> AppResult<ProjectDetail> {
        let plan = state.folder_plans().take(token)?;
        if plan.project_id != project_id { return Err(AppError::FolderPlanNotFound); }
        let project_path = super::project_detail_service::authorized_existing_project(state, project_id)?;
        let detail = ProjectDetailService::get(state, project_id)?;
        let fresh = build_plan(&detail, &project_path);
        if plan.root_path != fresh.root_path
            || plan.items.iter().map(|item| &item.path).ne(fresh.items.iter().map(|item| &item.path))
        {
            return Err(AppError::FolderPlanNotFound);
        }

        let root = PathBuf::from(&plan.root_path);
        for item in &plan.items {
            let path = PathBuf::from(&item.path);
            if !path.starts_with(&root) { return Err(AppError::InvalidPath("carpeta fuera del plan".into())); }
            fs::create_dir_all(&path).map_err(AppError::FileOperation)?;
        }

        let connection = state.database().connection()?;
        for item in &plan.items {
            let category = category(&item.category)?;
            ProjectDetailRepository::set_folder(&connection, project_id, category, Some(&item.path))?;
        }
        ProjectDetailRepository::get(&connection, project_id)
    }
}

fn build_plan(detail: &ProjectDetail, project_path: &Path) -> FolderSetupPlan {
    let parent = project_path.parent().unwrap_or(project_path);
    let stem = project_path.file_stem().and_then(|value| value.to_str()).unwrap_or("Project");
    let daw = detail.daw.to_ascii_lowercase();
    let (root, folders): (PathBuf, [(&str, PathBuf); 4]) = if daw.contains("fl studio") {
        let root = parent.to_path_buf();
        (root.clone(), [
            ("stems", root.join("Renders").join("Stems")),
            ("mixes", root.join("Renders").join("Mixes")),
            ("masters", root.join("Renders").join("Masters")),
            ("references", root.join("References")),
        ])
    } else if daw.contains("ableton") {
        let root = parent.to_path_buf();
        (root.clone(), [
            ("stems", root.join("Exports").join("Stems")),
            ("mixes", root.join("Exports").join("Mixes")),
            ("masters", root.join("Exports").join("Masters")),
            ("references", root.join("References")),
        ])
    } else if daw.contains("pro tools") {
        let root = parent.to_path_buf();
        (root.clone(), [
            ("stems", root.join("Bounced Files").join("Stems")),
            ("mixes", root.join("Bounced Files").join("Mixes")),
            ("masters", root.join("Bounced Files").join("Masters")),
            ("references", root.join("Reference Tracks")),
        ])
    } else {
        let root = parent.join(format!("{stem} Assets"));
        (root.clone(), [
            ("stems", root.join("Stems")),
            ("mixes", root.join("Mixes")),
            ("masters", root.join("Masters")),
            ("references", root.join("References")),
        ])
    };
    FolderSetupPlan {
        token: 0,
        project_id: detail.id,
        daw: detail.daw.clone(),
        root_path: root.to_string_lossy().into_owned(),
        items: folders.into_iter().map(|(category, path)| FolderSetupItem {
            category: category.into(),
            exists: path.is_dir(),
            path: path.to_string_lossy().into_owned(),
        }).collect(),
    }
}

fn category(value: &str) -> AppResult<ProjectFolderCategory> {
    match value {
        "stems" => Ok(ProjectFolderCategory::Stems),
        "mixes" => Ok(ProjectFolderCategory::Mixes),
        "masters" => Ok(ProjectFolderCategory::Masters),
        "references" => Ok(ProjectFolderCategory::References),
        _ => Err(AppError::InvalidPath("categoría de carpeta desconocida".into())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ProjectFolderPaths;

    fn detail(daw: &str) -> ProjectDetail {
        ProjectDetail {
            id: 1, display_name: "Demo".into(), original_name: "demo.flp".into(),
            file_path: "C:/Music/demo.flp".into(), extension: ".flp".into(), daw: daw.into(),
            cover_path: None, preview_path: None, bpm: None, musical_key: None, genre: None,
            status: "idea".into(), status_label: "Idea".into(), status_color: None, rating: None,
            notes: None, is_favorite: false, file_size: 0, file_created_at: None,
            file_modified_at: None, indexed_at: String::new(), updated_at: String::new(),
            is_missing: false, tags: Vec::new(), folders: ProjectFolderPaths::default(),
        }
    }

    #[test]
    fn preserves_fl_project_root_and_uses_renders() {
        let plan = build_plan(&detail("FL Studio"), Path::new("C:/Music/demo.flp"));
        assert!(plan.items[0].path.ends_with("Renders\\Stems") || plan.items[0].path.ends_with("Renders/Stems"));
        assert_eq!(plan.root_path, "C:/Music");
    }

    #[test]
    fn unknown_daws_use_a_non_intrusive_assets_sibling() {
        let plan = build_plan(&detail("Reaper"), Path::new("C:/Music/demo.rpp"));
        assert!(plan.root_path.ends_with("demo Assets"));
        assert!(plan.items.iter().all(|item| Path::new(&item.path).starts_with(&plan.root_path)));
    }
}

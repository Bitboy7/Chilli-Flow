use std::{fs, io::Cursor, path::{Component, Path, PathBuf}};

use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::{
    errors::{AppError, AppResult},
    models::{CoverAsset, ProjectDetail, ProjectFolderCategory, UpdateProjectInput},
    platform,
    repositories::ProjectDetailRepository,
    state::AppState,
};

const MAX_COVER_BYTES: u64 = 12 * 1024 * 1024;

pub struct ProjectDetailService;

impl ProjectDetailService {
    pub fn get(state: &AppState, project_id: i64) -> AppResult<ProjectDetail> {
        let connection = state.database().connection()?;
        ProjectDetailRepository::get(&connection, project_id)
    }

    pub fn update(
        state: &AppState,
        project_id: i64,
        input: UpdateProjectInput,
    ) -> AppResult<ProjectDetail> {
        let input = normalize_input(input)?;
        let mut connection = state.database().connection()?;
        ProjectDetailRepository::update(&mut connection, project_id, &input)
    }

    pub fn set_favorite(state: &AppState, project_id: i64, favorite: bool) -> AppResult<()> {
        let connection = state.database().connection()?;
        ProjectDetailRepository::set_favorite(&connection, project_id, favorite)
    }

    pub fn set_cover(state: &AppState, project_id: i64, selected: &Path) -> AppResult<()> {
        let canonical = dunce::canonicalize(selected)
            .map_err(|error| AppError::FileOperation(error))?;
        validate_cover(&canonical)?;
        let path = canonical.to_string_lossy().into_owned();
        let connection = state.database().connection()?;
        ProjectDetailRepository::set_cover(&connection, project_id, Some(&path))
    }

    pub fn clear_cover(state: &AppState, project_id: i64) -> AppResult<()> {
        let connection = state.database().connection()?;
        ProjectDetailRepository::set_cover(&connection, project_id, None)
    }

    pub fn cover_asset(state: &AppState, project_id: i64) -> AppResult<Option<CoverAsset>> {
        let detail = Self::get(state, project_id)?;
        let Some(path) = detail.cover_path else { return Ok(None); };
        let path = Path::new(&path);
        validate_cover(path)?;
        let bytes = thumbnail_bytes(path)?;
        Ok(Some(CoverAsset {
            data_url: format!("data:image/png;base64,{}", STANDARD.encode(bytes)),
        }))
    }

    pub fn rename_physical_file(
        state: &AppState,
        project_id: i64,
        new_stem: &str,
    ) -> AppResult<ProjectDetail> {
        let new_stem = validate_file_stem(new_stem)?;
        let (detail, watched_paths) = {
            let connection = state.database().connection()?;
            (
                ProjectDetailRepository::get(&connection, project_id)?,
                ProjectDetailRepository::watched_paths(&connection)?,
            )
        };
        let source = dunce::canonicalize(&detail.file_path)
            .map_err(AppError::FileOperation)?;
        authorize_project_path(&source, &watched_paths)?;
        let parent = source.parent().ok_or_else(|| AppError::InvalidProject("ruta sin carpeta padre".into()))?;
        let target = parent.join(format!("{new_stem}{}", detail.extension));
        if target.exists() {
            return Err(AppError::InvalidProject("ya existe un archivo con ese nombre".into()));
        }

        fs::rename(&source, &target).map_err(AppError::FileOperation)?;
        let target_string = target.to_string_lossy().into_owned();
        let original_name = target.file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| AppError::InvalidProject("nombre no representable en UTF-8".into()))?;
        let database_result = {
            let connection = state.database().connection()?;
            ProjectDetailRepository::update_physical_path(
                &connection,
                project_id,
                &target_string,
                original_name,
            )
        };
        if let Err(error) = database_result {
            let _ = fs::rename(&target, &source);
            return Err(error);
        }
        Self::get(state, project_id)
    }

    pub fn open_project(state: &AppState, project_id: i64) -> AppResult<()> {
        let path = authorized_existing_project(state, project_id)?;
        platform::open_path(&path)
    }

    pub fn open_project_folder(state: &AppState, project_id: i64) -> AppResult<()> {
        let path = authorized_existing_project(state, project_id)?;
        let folder = path.parent().ok_or_else(|| AppError::InvalidProject("ruta sin carpeta padre".into()))?;
        platform::open_path(folder)
    }

    pub fn reveal_project(state: &AppState, project_id: i64) -> AppResult<()> {
        let path = authorized_existing_project(state, project_id)?;
        platform::reveal_path(&path)
    }

    pub fn set_project_folder(
        state: &AppState,
        project_id: i64,
        category: ProjectFolderCategory,
        selected: &Path,
    ) -> AppResult<ProjectDetail> {
        let path = platform::canonicalize_directory(&selected.to_string_lossy())?;
        let path = path.to_string_lossy().into_owned();
        let connection = state.database().connection()?;
        ProjectDetailRepository::set_folder(&connection, project_id, category, Some(&path))?;
        ProjectDetailRepository::get(&connection, project_id)
    }

    pub fn clear_project_folder(
        state: &AppState,
        project_id: i64,
        category: ProjectFolderCategory,
    ) -> AppResult<ProjectDetail> {
        let connection = state.database().connection()?;
        ProjectDetailRepository::set_folder(&connection, project_id, category, None)?;
        ProjectDetailRepository::get(&connection, project_id)
    }

    pub fn open_project_asset_folder(
        state: &AppState,
        project_id: i64,
        category: ProjectFolderCategory,
    ) -> AppResult<()> {
        let detail = Self::get(state, project_id)?;
        let selected = match category {
            ProjectFolderCategory::Stems => detail.folders.stems,
            ProjectFolderCategory::Mixes => detail.folders.mixes,
            ProjectFolderCategory::Masters => detail.folders.masters,
            ProjectFolderCategory::References => detail.folders.references,
        }.ok_or_else(|| AppError::InvalidProject("no hay una carpeta configurada para esa categoría".into()))?;
        let path = platform::canonicalize_directory(&selected)?;
        platform::open_path(&path)
    }
}

pub(crate) fn authorized_existing_project(state: &AppState, project_id: i64) -> AppResult<PathBuf> {
    let (detail, watched_paths) = {
        let connection = state.database().connection()?;
        (
            ProjectDetailRepository::get(&connection, project_id)?,
            ProjectDetailRepository::watched_paths(&connection)?,
        )
    };
    let path = dunce::canonicalize(detail.file_path).map_err(AppError::FileOperation)?;
    authorize_project_path(&path, &watched_paths)?;
    Ok(path)
}

fn authorize_project_path(path: &Path, watched_paths: &[String]) -> AppResult<()> {
    let authorized = watched_paths.iter().any(|watched| {
        dunce::canonicalize(watched)
            .map(|folder| path.starts_with(folder))
            .unwrap_or(false)
    });
    if authorized { Ok(()) } else { Err(AppError::UnauthorizedProjectPath) }
}

fn normalize_input(mut input: UpdateProjectInput) -> AppResult<UpdateProjectInput> {
    input.display_name = input.display_name.trim().to_owned();
    if input.display_name.is_empty() || input.display_name.chars().count() > 200 {
        return Err(AppError::InvalidProject("el nombre visual debe tener entre 1 y 200 caracteres".into()));
    }
    if input.bpm.is_some_and(|bpm| !bpm.is_finite() || bpm <= 0.0 || bpm >= 1000.0) {
        return Err(AppError::InvalidProject("el BPM debe estar entre 0 y 1000".into()));
    }
    input.musical_key = normalize_optional(input.musical_key, 32, "tonalidad")?;
    input.genre = normalize_optional(input.genre, 100, "género")?;
    input.notes = normalize_optional(input.notes, 10_000, "notas")?;
    if input.rating.is_some_and(|rating| !(0..=5).contains(&rating)) {
        return Err(AppError::InvalidProject("la calificación debe estar entre 0 y 5".into()));
    }
    input.status = input.status.trim().to_owned();
    if input.status.is_empty() { return Err(AppError::InvalidProject("el estado es obligatorio".into())); }
    if input.tags.len() > 20 { return Err(AppError::InvalidProject("se permiten hasta 20 etiquetas".into())); }
    let mut tags = Vec::new();
    for tag in input.tags {
        let tag = tag.trim();
        if tag.is_empty() { continue; }
        if tag.chars().count() > 40 { return Err(AppError::InvalidProject("cada etiqueta admite hasta 40 caracteres".into())); }
        if !tags.iter().any(|existing: &String| existing.eq_ignore_ascii_case(tag)) {
            tags.push(tag.to_owned());
        }
    }
    input.tags = tags;
    Ok(input)
}

fn normalize_optional(value: Option<String>, max: usize, field: &str) -> AppResult<Option<String>> {
    let Some(value) = value else { return Ok(None); };
    let value = value.trim();
    if value.is_empty() { return Ok(None); }
    if value.chars().count() > max {
        return Err(AppError::InvalidProject(format!("{field} supera {max} caracteres")));
    }
    Ok(Some(value.to_owned()))
}

fn validate_file_stem(value: &str) -> AppResult<&str> {
    let value = value.trim();
    let path = Path::new(value);
    let valid_component = path.components().count() == 1
        && matches!(path.components().next(), Some(Component::Normal(_)));
    if value.is_empty() || value.chars().count() > 200 || !valid_component || value.ends_with('.') {
        return Err(AppError::InvalidProject("el nuevo nombre no es válido".into()));
    }
    Ok(value)
}

fn validate_cover(path: &Path) -> AppResult<()> {
    let metadata = fs::metadata(path).map_err(AppError::FileOperation)?;
    if !metadata.is_file() { return Err(AppError::UnsupportedImage); }
    if metadata.len() > MAX_COVER_BYTES { return Err(AppError::CoverTooLarge); }
    cover_mime(path).map(|_| ()).ok_or(AppError::UnsupportedImage)
}

fn cover_mime(path: &Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        _ => None,
    }
}

fn thumbnail_bytes(path: &Path) -> AppResult<Vec<u8>> {
    let mut reader = image::ImageReader::open(path)
        .map_err(AppError::FileOperation)?
        .with_guessed_format()
        .map_err(AppError::FileOperation)?;
    reader.limits(image::Limits::default());
    let image = reader
        .decode()
        .map_err(|error| AppError::ImageProcessing(error.to_string()))?;
    let thumbnail = image.thumbnail(640, 400);
    let mut output = Cursor::new(Vec::new());
    thumbnail.write_to(&mut output, image::ImageFormat::Png)
        .map_err(|error| AppError::ImageProcessing(error.to_string()))?;
    Ok(output.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_like_physical_names() {
        assert!(validate_file_stem("../escape").is_err());
        assert!(validate_file_stem("folder/name").is_err());
        assert!(validate_file_stem("valid beat").is_ok());
    }

    #[test]
    fn normalizes_tags_and_optional_fields() {
        let input = normalize_input(UpdateProjectInput {
            display_name: "  Demo  ".into(), bpm: Some(120.0), musical_key: Some(" ".into()),
            genre: None, status: "idea".into(), rating: Some(4), notes: None,
            tags: vec![" Client ".into(), "client".into(), "".into()],
        }).expect("valid input");
        assert_eq!(input.display_name, "Demo");
        assert_eq!(input.musical_key, None);
        assert_eq!(input.tags, vec!["Client"]);
    }

    #[test]
    fn cover_thumbnail_is_bounded_for_large_artwork() {
        let directory = tempfile::tempdir().expect("directory");
        let path = directory.path().join("cover.png");
        image::DynamicImage::new_rgb8(1600, 1200).save(&path).expect("save image");
        let bytes = thumbnail_bytes(&path).expect("thumbnail");
        let thumbnail = image::load_from_memory(&bytes).expect("decode thumbnail");
        assert!(thumbnail.width() <= 640);
        assert!(thumbnail.height() <= 400);
    }
}

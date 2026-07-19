use std::path::{Path, PathBuf};

use crate::errors::{AppError, AppResult};

pub fn canonicalize_directory(raw_path: &str) -> AppResult<PathBuf> {
    let path = Path::new(raw_path.trim());
    if raw_path.trim().is_empty() {
        return Err(AppError::InvalidPath("La ruta está vacía".to_string()));
    }

    let canonical = dunce::canonicalize(path)
        .map_err(|error| AppError::InvalidPath(format!("No se pudo resolver la ruta: {error}")))?;

    if !canonical.is_dir() {
        return Err(AppError::InvalidPath(
            "La ruta seleccionada no es una carpeta".to_string(),
        ));
    }

    if canonical.parent().is_none() {
        return Err(AppError::InvalidPath(
            "Selecciona una carpeta concreta, no la raíz completa del disco".to_string(),
        ));
    }

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn accepts_existing_directories_and_rejects_files() {
        let directory = tempdir().expect("temporary directory");
        let file = directory.path().join("project.flp");
        fs::write(&file, b"project").expect("test file");

        assert!(canonicalize_directory(
            directory.path().to_string_lossy().as_ref()
        )
        .is_ok());
        assert!(canonicalize_directory(file.to_string_lossy().as_ref()).is_err());
    }
}

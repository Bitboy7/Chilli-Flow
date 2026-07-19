use std::{path::Path, process::Command};

use crate::errors::{AppError, AppResult};

pub fn open_path(path: &Path) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    let mut command = { let mut value = Command::new("explorer.exe"); value.arg(path); value };
    #[cfg(target_os = "macos")]
    let mut command = { let mut value = Command::new("open"); value.arg(path); value };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = { let mut value = Command::new("xdg-open"); value.arg(path); value };

    command.spawn().map_err(AppError::FileOperation)?;
    Ok(())
}

pub fn reveal_path(path: &Path) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut value = Command::new("explorer.exe");
        value.arg("/select,").arg(path);
        value
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut value = Command::new("open");
        value.arg("-R").arg(path);
        value
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut value = Command::new("xdg-open");
        value.arg(path.parent().unwrap_or(path));
        value
    };

    command.spawn().map_err(AppError::FileOperation)?;
    Ok(())
}

use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("No se pudo acceder al directorio de datos de la aplicación: {0}")]
    AppDataDirectory(#[source] tauri::Error),
    #[error("No se pudo preparar el directorio de datos: {0}")]
    CreateDataDirectory(#[source] std::io::Error),
    #[error("Error de base de datos: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("La base de datos está ocupada por otra operación")]
    DatabaseLock,
}

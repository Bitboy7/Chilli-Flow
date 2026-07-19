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
    #[error("Ruta no válida: {0}")]
    InvalidPath(String),
    #[error("La carpeta supervisada no existe")]
    WatchedFolderNotFound,
    #[error("No hay carpetas activas para escanear")]
    NoEnabledFolders,
    #[error("La extensión personalizada no es válida")]
    InvalidExtension,
    #[error("El nombre del DAW no puede estar vacío")]
    InvalidDawName,
    #[error("La extensión ya está registrada")]
    ExtensionAlreadyExists,
    #[error("La carpeta ya está supervisada")]
    WatchedFolderAlreadyExists,
    #[error("No se pudo acceder al estado del escáner")]
    ScanStateLock,
    #[error("No existe un escaneo activo con ese identificador")]
    ScanNotFound,
    #[error("Ya hay un escaneo en curso")]
    ScanAlreadyRunning,
}

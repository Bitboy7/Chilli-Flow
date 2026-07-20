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
    #[error("No se pudo acceder al plan de carpetas")]
    FolderPlanStateLock,
    #[error("La vista previa de carpetas expiró; genera una nueva")]
    FolderPlanNotFound,
    #[error("No existe un escaneo activo con ese identificador")]
    ScanNotFound,
    #[error("Ya hay un escaneo en curso")]
    ScanAlreadyRunning,
    #[error("El proyecto solicitado no existe")]
    ProjectNotFound,
    #[error("Datos del proyecto no válidos: {0}")]
    InvalidProject(String),
    #[error("La ruta del proyecto no pertenece a una carpeta supervisada")]
    UnauthorizedProjectPath,
    #[error("No se pudo completar la operación de archivo: {0}")]
    FileOperation(#[source] std::io::Error),
    #[error("La imagen seleccionada no tiene un formato compatible")]
    UnsupportedImage,
    #[error("La portada supera el límite de 12 MB")]
    CoverTooLarge,
    #[error("No se pudo procesar la portada: {0}")]
    ImageProcessing(String),
    #[error("El archivo asociado solicitado no existe")]
    AssociatedFileNotFound,
    #[error("El archivo seleccionado no es un audio compatible con el preview")]
    UnsupportedAudio,
    #[error("No se pudo analizar el audio: {0}")]
    AudioAnalysis(String),
    #[error("Estado del reproductor no válido: {0}")]
    InvalidPlaybackSession(String),
    #[error("Plan para terminar no válido: {0}")]
    InvalidFinishPlan(String),
    #[error("No se pudo serializar el estado local: {0}")]
    Serialization(#[from] serde_json::Error),
}

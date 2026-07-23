use crate::{
    errors::{AppError, AppResult},
    models::{CustomExtension, ExtensionCatalogItem},
    repositories::CustomExtensionRepository,
    scanner::{normalize_extension, KNOWN_DAWS},
    state::AppState,
};

pub struct ExtensionService;

impl ExtensionService {
    pub fn catalog(state: &AppState) -> AppResult<Vec<ExtensionCatalogItem>> {
        let connection = state.database().connection()?;
        let custom_extensions = CustomExtensionRepository::list(&connection)?;
        let mut catalog = KNOWN_DAWS
            .iter()
            .map(|definition| ExtensionCatalogItem {
                extension: definition.extension.to_string(),
                daw_name: definition.daw_name.to_string(),
                is_custom: false,
                custom_extension_id: None,
                is_enabled: true,
            })
            .collect::<Vec<_>>();
        catalog.extend(
            custom_extensions
                .into_iter()
                .map(|extension| ExtensionCatalogItem {
                    extension: extension.extension,
                    daw_name: extension.daw_name,
                    is_custom: true,
                    custom_extension_id: Some(extension.id),
                    is_enabled: extension.is_enabled,
                }),
        );
        Ok(catalog)
    }

    pub fn add(
        state: &AppState,
        raw_extension: &str,
        raw_daw_name: &str,
    ) -> AppResult<CustomExtension> {
        let extension = normalize_extension(raw_extension).ok_or(AppError::InvalidExtension)?;
        let daw_name = raw_daw_name.trim();
        if daw_name.is_empty() || daw_name.len() > 80 {
            return Err(AppError::InvalidDawName);
        }
        if KNOWN_DAWS.iter().any(|known| known.extension == extension) {
            return Err(AppError::ExtensionAlreadyExists);
        }

        let connection = state.database().connection()?;
        if CustomExtensionRepository::exists(&connection, &extension)? {
            return Err(AppError::ExtensionAlreadyExists);
        }

        CustomExtensionRepository::insert(&connection, &extension, daw_name)
    }

    pub fn set_enabled(state: &AppState, id: i64, enabled: bool) -> AppResult<()> {
        let connection = state.database().connection()?;
        CustomExtensionRepository::set_enabled(&connection, id, enabled)
    }

    pub fn remove(state: &AppState, id: i64) -> AppResult<()> {
        let connection = state.database().connection()?;
        CustomExtensionRepository::remove(&connection, id)
    }
}

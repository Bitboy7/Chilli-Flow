use crate::{
    errors::AppResult,
    models::ScanHistoryPage,
    repositories::ScanHistoryRepository,
    state::AppState,
};

pub struct ScanHistoryService;

impl ScanHistoryService {
    pub fn page(state: &AppState, page: u32, page_size: u32) -> AppResult<ScanHistoryPage> {
        let connection = state.database().connection()?;
        ScanHistoryRepository::page(&connection, page, page_size)
    }
}

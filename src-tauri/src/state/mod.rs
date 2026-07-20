use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
};

use crate::{
    database::Database,
    errors::{AppError, AppResult},
    models::FolderSetupPlan,
};

pub struct ScanCoordinator {
    next_session_id: AtomicU64,
    cancellations: Mutex<HashMap<u64, Arc<AtomicBool>>>,
}

impl ScanCoordinator {
    fn new() -> Self {
        Self {
            next_session_id: AtomicU64::new(1),
            cancellations: Mutex::new(HashMap::new()),
        }
    }

    pub fn begin(&self) -> AppResult<(u64, Arc<AtomicBool>)> {
        let mut cancellations = self
            .cancellations
            .lock()
            .map_err(|_| AppError::ScanStateLock)?;
        if !cancellations.is_empty() {
            return Err(AppError::ScanAlreadyRunning);
        }

        let session_id = self.next_session_id.fetch_add(1, Ordering::Relaxed);
        let cancellation = Arc::new(AtomicBool::new(false));
        cancellations.insert(session_id, Arc::clone(&cancellation));

        Ok((session_id, cancellation))
    }

    pub fn cancel(&self, session_id: u64) -> AppResult<()> {
        let cancellations = self
            .cancellations
            .lock()
            .map_err(|_| AppError::ScanStateLock)?;
        let cancellation = cancellations
            .get(&session_id)
            .ok_or(AppError::ScanNotFound)?;
        cancellation.store(true, Ordering::Relaxed);
        Ok(())
    }

    pub fn finish(&self, session_id: u64) {
        if let Ok(mut cancellations) = self.cancellations.lock() {
            cancellations.remove(&session_id);
        }
    }
}

pub struct AppState {
    database: Database,
    scans: ScanCoordinator,
    folder_plans: FolderPlanCoordinator,
}

pub struct FolderPlanCoordinator {
    next_token: AtomicU64,
    plans: Mutex<HashMap<u64, FolderSetupPlan>>,
}

impl FolderPlanCoordinator {
    fn new() -> Self {
        Self { next_token: AtomicU64::new(1), plans: Mutex::new(HashMap::new()) }
    }

    pub fn store(&self, mut plan: FolderSetupPlan) -> AppResult<FolderSetupPlan> {
        let token = self.next_token.fetch_add(1, Ordering::Relaxed);
        plan.token = token;
        self.plans.lock().map_err(|_| AppError::FolderPlanStateLock)?.insert(token, plan.clone());
        Ok(plan)
    }

    pub fn take(&self, token: u64) -> AppResult<FolderSetupPlan> {
        self.plans.lock().map_err(|_| AppError::FolderPlanStateLock)?
            .remove(&token).ok_or(AppError::FolderPlanNotFound)
    }
}

impl AppState {
    pub fn new(database: Database) -> Self {
        Self {
            database,
            scans: ScanCoordinator::new(),
            folder_plans: FolderPlanCoordinator::new(),
        }
    }

    pub fn database(&self) -> &Database {
        &self.database
    }

    pub fn scans(&self) -> &ScanCoordinator {
        &self.scans
    }

    pub fn folder_plans(&self) -> &FolderPlanCoordinator {
        &self.folder_plans
    }
}

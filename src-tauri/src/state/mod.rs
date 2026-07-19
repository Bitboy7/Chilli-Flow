use crate::database::Database;

pub struct AppState {
    database: Database,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub fn database(&self) -> &Database {
        &self.database
    }
}

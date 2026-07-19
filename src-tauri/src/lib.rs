mod commands;
mod database;
mod errors;
mod models;
mod platform;
mod repositories;
mod scanner;
mod services;
mod state;

use database::Database;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database = Database::initialize(&app.handle())?;
            app.manage(AppState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::app::get_app_status])
        .run(tauri::generate_context!())
        .expect("Chilli Beat could not start");
}

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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let database = Database::initialize(&app.handle())?;
            app.manage(AppState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::get_app_status,
            commands::extensions::get_extension_catalog,
            commands::extensions::add_custom_extension,
            commands::extensions::set_custom_extension_enabled,
            commands::extensions::remove_custom_extension,
            commands::folders::list_watched_folders,
            commands::folders::add_watched_folder,
            commands::folders::set_watched_folder_enabled,
            commands::folders::remove_watched_folder,
            commands::scanning::start_scan,
            commands::scanning::cancel_scan,
        ])
        .run(tauri::generate_context!())
        .expect("Chilli Beat could not start");
}

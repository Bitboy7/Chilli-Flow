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
            commands::audio_analysis::analyze_project_audio,
            commands::app::get_app_status,
            commands::workspaces::list_daw_installations,
            commands::workspaces::select_workspace_parent,
            commands::workspaces::select_workspace_template,
            commands::workspaces::create_workspace,
            commands::extensions::get_extension_catalog,
            commands::extensions::add_custom_extension,
            commands::extensions::set_custom_extension_enabled,
            commands::extensions::remove_custom_extension,
            commands::folder_setup::preview_project_folder_setup,
            commands::folder_setup::apply_project_folder_setup,
            commands::finish_mode::get_finish_dashboard,
            commands::finish_mode::get_project_finish_plan,
            commands::handoff::get_handoff_preview,
            commands::handoff::select_handoff_destination,
            commands::handoff::create_handoff,
            commands::handoff::open_handoff_destination,
            commands::finish_mode::update_project_finish_plan,
            commands::folders::list_watched_folders,
            commands::folders::add_watched_folder,
            commands::folders::set_watched_folder_enabled,
            commands::folders::remove_watched_folder,
            commands::library::list_projects,
            commands::library::get_project_facets,
            commands::projects::get_project,
            commands::projects::update_project,
            commands::projects::set_project_favorite,
            commands::projects::select_project_cover,
            commands::projects::clear_project_cover,
            commands::projects::get_project_cover,
            commands::projects::rename_project_file,
            commands::projects::open_project,
            commands::projects::open_project_folder,
            commands::projects::reveal_project,
            commands::projects::select_project_asset_folder,
            commands::projects::clear_project_asset_folder,
            commands::projects::open_project_asset_folder,
            commands::project_versions::list_project_versions,
            commands::project_versions::confirm_project_version,
            commands::project_versions::detach_project_version,
            commands::project_versions::promote_project_version,
            commands::project_versions::open_project_version,
            commands::project_versions::reveal_project_version,
            commands::project_files::list_project_files,
            commands::project_files::sync_project_files,
            commands::project_files::select_project_files,
            commands::project_files::remove_project_file,
            commands::project_files::set_project_file_category,
            commands::project_files::open_project_file,
            commands::project_files::set_project_preview,
            commands::project_files::authorize_project_audio,
            commands::playback::get_playback_session,
            commands::playback::save_playback_session,
            commands::scanning::start_scan,
            commands::scanning::cancel_scan,
            commands::scanning::get_scan_history,
        ])
        .run(tauri::generate_context!())
        .expect("Chilli Beat could not start");
}

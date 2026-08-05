mod commands;
mod db;
mod models;
mod repositories;
mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let db_state = db::init(&app_data_dir)?;

            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::get_library_status,
            commands::settings::save_library_path,
            commands::settings::get_default_library_path,
            commands::library::validate_empty_library_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BookHive");
}
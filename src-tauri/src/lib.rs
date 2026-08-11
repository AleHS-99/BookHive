mod commands;
mod db;
mod models;
mod repositories;
mod services;

use tauri::Manager;

fn cover_error_response(status: u16, message: &str) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(status)
        .header("Content-Type", "text/plain; charset=utf-8")
        .body(message.as_bytes().to_vec())
        .unwrap_or_else(|_| tauri::http::Response::new(Vec::new()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .register_uri_scheme_protocol(
            "cover",
            |ctx: tauri::UriSchemeContext<'_, tauri::Wry>,
             request: tauri::http::Request<Vec<u8>>|
             -> tauri::http::Response<Vec<u8>> {
                let app = ctx.app_handle();

                let covers_dir = match crate::services::cover_service::covers_dir(app) {
                    Ok(dir) => dir,
                    Err(e) => {
                        return cover_error_response(500, &e);
                    }
                };

                let path = request.uri().path();
                let file_name = path.trim_start_matches('/');

                let file_name = match std::path::Path::new(file_name)
                    .file_name()
                    .and_then(|n| n.to_str())
                {
                    Some(name) => name,
                    None => {
                        return cover_error_response(400, "Nombre de cover inválido");
                    }
                };

                if !file_name.ends_with(".webp") {
                    return cover_error_response(400, "El cover solicitado debe ser .webp");
                }

                let file_path = covers_dir.join(file_name);

                let data = match std::fs::read(&file_path) {
                    Ok(data) => data,
                    Err(_) => {
                        return cover_error_response(404, "Cover no encontrado");
                    }
                };

                tauri::http::Response::builder()
                    .status(200)
                    .header("Content-Type", "image/webp")
                    .header("Cache-Control", "public, max-age=604800")
                    .body(data)
                    .unwrap_or_else(|_| cover_error_response(500, "Error creando respuesta"))
            },
        )
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
            commands::library::sync_library,
            commands::library::get_library_tree,
            commands::library::process_pending_covers,
            commands::library::get_folder_page,
            commands::library::search_books,
            commands::folder::get_folder_picker_children,
            commands::folder::create_folder,
            commands::folder::move_book,
            commands::library::process_pending_metadata,
            commands::library::get_book_properties,
            commands::library::rename_book_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BookHive");
}

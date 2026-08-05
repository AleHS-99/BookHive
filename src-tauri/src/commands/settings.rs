use crate::db::Db;
use crate::models::{AppSettings, LibraryStatus};
use crate::repositories::settings_repository;
use crate::services::library_service;
use std::path::PathBuf;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_settings(db: State<'_, Db>) -> Result<AppSettings, String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let library_path = settings_repository::get_library_path(&conn)?;

    Ok(AppSettings { library_path })
}

#[tauri::command]
pub fn get_library_status(db: State<'_, Db>) -> Result<LibraryStatus, String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let library_path = settings_repository::get_library_path(&conn)?;

    match library_path {
        None => Ok(LibraryStatus {
            configured: false,
            library_path: None,
            is_empty: false,
        }),

        Some(path) => {
            let path_buf = PathBuf::from(&path);

            if !path_buf.exists() || !path_buf.is_dir() {
                return Ok(LibraryStatus {
                    configured: false,
                    library_path: Some(path),
                    is_empty: false,
                });
            }

            let is_empty = library_service::is_dir_empty(&path_buf).unwrap_or(false);

            Ok(LibraryStatus {
                configured: true,
                library_path: Some(path),
                is_empty,
            })
        }
    }
}

#[tauri::command]
pub fn save_library_path(
    db: State<'_, Db>,
    path: String,
) -> Result<AppSettings, String> {
    let path_buf = library_service::normalize_path(&path);

    library_service::validate_empty_folder(&path_buf)?;

    let path_buf = path_buf
        .canonicalize()
        .map_err(|e| format!("No se pudo resolver la ruta seleccionada: {e}"))?;

    let path_string = path_buf.to_string_lossy().to_string();

    {
        let conn = db
            .0
            .lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

        settings_repository::set_library_path(&conn, &path_string)?;
    }

    Ok(AppSettings {
        library_path: Some(path_string),
    })
}

#[tauri::command]
pub fn get_default_library_path(app: AppHandle) -> Result<String, String> {
    let path = library_service::default_library_dir(&app)?;
    Ok(path.to_string_lossy().to_string())
}
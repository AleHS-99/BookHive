use crate::db::Db;
use crate::models::{FolderDto, SyncSummary};
use crate::repositories::{book_repository, settings_repository};
use crate::services::{cover_service, library_service, sync_service, tree_service};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
struct CoverUpdatedPayload {
    #[serde(rename = "bookId")]
    book_id: String,

    #[serde(rename = "imageUrl")]
    image_url: String,
}

#[tauri::command]
pub fn validate_empty_library_folder(path: String) -> Result<(), String> {
    let path_buf = library_service::normalize_path(&path);
    library_service::validate_empty_folder(&path_buf)
}

#[tauri::command]
pub fn sync_library(db: State<'_, Db>, app: AppHandle) -> Result<SyncSummary, String> {
    let mut conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = PathBuf::from(library_path);
    library_service::validate_folder(&root)?;

    let covers_dir = cover_service::covers_dir(&app)?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("No se pudo iniciar la transacción: {e}"))?;

    let summary = sync_service::sync_library(&tx, &root)?;

    tx.commit()
        .map_err(|e| format!("No se pudo confirmar la transacción: {e}"))?;

    cover_service::cleanup_covers(&conn, &covers_dir)?;

    Ok(summary)
}

#[tauri::command]
pub fn get_library_tree(db: State<'_, Db>, app: AppHandle) -> Result<FolderDto, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let covers_dir = cover_service::covers_dir(&app)?;

    tree_service::build_root_tree(&conn, &covers_dir)
}

#[tauri::command]
pub async fn process_pending_covers(app: AppHandle, db: State<'_, Db>) -> Result<u32, String> {
    let db = db.inner().clone();
    let covers_dir = cover_service::covers_dir(&app)?;

    tauri::async_runtime::spawn_blocking(move || {
        let should_reset_covers = {
            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            let current_version = settings_repository::get_setting(&conn, "cover_version")?;

            current_version.as_deref() != Some(cover_service::COVER_CACHE_VERSION)
        };

        if should_reset_covers {
            cover_service::clear_covers_dir(&covers_dir)?;

            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            book_repository::reset_epub_covers(&conn)?;

            settings_repository::set_setting(
                &conn,
                "cover_version",
                cover_service::COVER_CACHE_VERSION,
            )?;
        }

        let library_path = {
            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            settings_repository::get_library_path(&conn)?
                .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?
        };

        let root = PathBuf::from(library_path);

        let pending = {
            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            book_repository::get_pending_covers(&conn)?
        };

        let mut processed = 0u32;

        for item in pending {
            if item.format != "epub" {
                continue;
            }

            let result = cover_service::generate_epub_cover(
                &root,
                &item.relative_path,
                &covers_dir,
                item.id,
            );

            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            match result {
                Ok(file_name) => {
                    book_repository::update_cover_ready(&conn, item.id, &file_name)?;

                    drop(conn);

                    let _ = app.emit(
                        "book-cover-updated",
                        CoverUpdatedPayload {
                            book_id: format!("book:{}", item.id),
                            image_url: format!("cover://localhost/{file_name}"),
                        },
                    );

                    processed += 1;
                }
                Err(_) => {
                    book_repository::update_cover_failed(&conn, item.id)?;
                }
            }
        }

        Ok(processed)
    })
    .await
    .map_err(|e| format!("Error en la tarea de portadas: {e}"))?
}

#[tauri::command]
pub fn get_folder_page(
    db: State<'_, Db>,
    app: AppHandle,
    folder_id: Option<i64>,
    page: u32,
    page_size: u32,
) -> Result<crate::models::PaginatedTreePage, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let covers_dir = cover_service::covers_dir(&app)?;

    tree_service::get_folder_page(&conn, &covers_dir, folder_id, page, page_size)
}

#[tauri::command]
pub fn search_books(
    db: State<'_, Db>,
    app: AppHandle,
    query: String,
    page: u32,
    page_size: u32,
) -> Result<crate::models::SearchPage, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let covers_dir = cover_service::covers_dir(&app)?;

    crate::services::search_service::search_books(&conn, &covers_dir, &query, page, page_size)
}

#[tauri::command]
pub async fn process_pending_metadata(app: AppHandle, db: State<'_, Db>) -> Result<u32, String> {
    let db = db.inner().clone();

    tauri::async_runtime::spawn_blocking(move || {
        let library_path = {
            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            settings_repository::get_library_path(&conn)?
                .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?
        };

        let root = PathBuf::from(library_path);

        let pending = {
            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            book_repository::get_books_pending_metadata(&conn)?
        };

        let mut processed = 0u32;

        for item in pending {
            if item.format != "epub" {
                continue;
            }

            let book_path = root.join(&item.relative_path);

            let result = crate::services::metadata_service::extract_epub_metadata(&book_path);

            let conn =
                db.0.lock()
                    .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            match result {
                Ok(metadata) => {
                    book_repository::update_book_metadata(&conn, item.id, &metadata)?;

                    drop(conn);

                    let _ = app.emit(
                        "book-metadata-updated",
                        serde_json::json!({
                            "bookId": format!("book:{}", item.id),
                        }),
                    );

                    processed += 1;
                }
                Err(_) => {
                    book_repository::update_metadata_failed(&conn, item.id)?;
                }
            }
        }

        Ok(processed)
    })
    .await
    .map_err(|e| format!("Error en la tarea de metadatos: {e}"))?
}

#[tauri::command]
pub fn get_book_properties(
    db: State<'_, Db>,
    app: AppHandle,
    book_id: i64,
) -> Result<crate::models::BookPropertiesDto, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    crate::services::book_service::get_book_properties(&app, &conn, book_id)
}

#[tauri::command]
pub fn rename_book_file(
    db: State<'_, Db>,
    app: AppHandle,
    book_id: i64,
    new_name: String,
) -> Result<(), String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    crate::services::book_service::rename_book_file(&app, &conn, book_id, &new_name)
}

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn open_book_external(
    db: State<'_, Db>,
    app: AppHandle,
    book_id: i64,
) -> Result<(), String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let relative_path = book_repository::get_book_relative_path(&conn, book_id)?
        .ok_or_else(|| "Libro no encontrado.".to_string())?;

    let root = PathBuf::from(library_path);
    let full_path = root.join(&relative_path);

    if !full_path.exists() {
        return Err("El archivo no existe en el sistema de archivos.".to_string());
    }

    app.opener()
        .open_path(full_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("No se pudo abrir el archivo: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_book(
    db: State<'_, Db>,
    app: AppHandle,
    book_id: i64,
) -> Result<(), String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    crate::services::book_service::delete_book(&app, &conn, book_id)
}

#[tauri::command]
pub fn import_books(
    db: State<'_, Db>,
    app: AppHandle,
    file_paths: Vec<String>,
    target_folder_id: Option<i64>,
) -> Result<u32, String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    crate::services::book_service::import_books(&app, &conn, &file_paths, target_folder_id)
}
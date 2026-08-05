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
pub fn sync_library(db: State<'_, Db>) -> Result<SyncSummary, String> {
    let mut conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = PathBuf::from(library_path);
    library_service::validate_folder(&root)?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("No se pudo iniciar la transacción: {e}"))?;

    let summary = sync_service::sync_library(&tx, &root)?;

    tx.commit()
        .map_err(|e| format!("No se pudo confirmar la transacción: {e}"))?;

    Ok(summary)
}

#[tauri::command]
pub fn get_library_tree(
    db: State<'_, Db>,
    app: AppHandle,
) -> Result<FolderDto, String> {
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let covers_dir = cover_service::covers_dir(&app)?;

    tree_service::build_root_tree(&conn, &covers_dir)
}

#[tauri::command]
pub async fn process_pending_covers(
    app: AppHandle,
    db: State<'_, Db>,
) -> Result<u32, String> {
    let db = db.inner().clone();
    let covers_dir = cover_service::covers_dir(&app)?;

    tauri::async_runtime::spawn_blocking(move || {
        let should_reset_covers = {
            let conn = db
                .0
                .lock()
                .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            let current_version =
                settings_repository::get_setting(&conn, "cover_version")?;

            current_version.as_deref() != Some(cover_service::COVER_CACHE_VERSION)
        };

        if should_reset_covers {
            cover_service::clear_covers_dir(&covers_dir)?;

            let conn = db
                .0
                .lock()
                .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            book_repository::reset_epub_covers(&conn)?;

            settings_repository::set_setting(
                &conn,
                "cover_version",
                cover_service::COVER_CACHE_VERSION,
            )?;
        }

        let library_path = {
            let conn = db
                .0
                .lock()
                .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

            settings_repository::get_library_path(&conn)?
                .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?
        };

        let root = PathBuf::from(library_path);

        let pending = {
            let conn = db
                .0
                .lock()
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

            let conn = db
                .0
                .lock()
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
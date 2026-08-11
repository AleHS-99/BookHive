use crate::db::Db;
use crate::models::FolderPickerPage;
use crate::repositories::settings_repository;
use crate::services::folder_service;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_folder_picker_children(
    db: State<'_, Db>,
    parent_id: Option<i64>,
    page: u32,
    page_size: u32,
) -> Result<FolderPickerPage, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let _library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    folder_service::get_picker_page(&conn, parent_id, page, page_size)
}

#[tauri::command]
pub fn create_folder(
    db: State<'_, Db>,
    app: AppHandle,
    parent_id: Option<i64>,
    name: String,
) -> Result<String, String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let folder_id = folder_service::create_folder(&app, &conn, parent_id, &name)?;

    Ok(format!("folder:{folder_id}"))
}

#[tauri::command]
pub fn move_book(
    db: State<'_, Db>,
    app: AppHandle,
    book_id: i64,
    target_folder_id: Option<i64>,
) -> Result<(), String> {
    let conn =
        db.0.lock()
            .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    folder_service::move_book(&app, &conn, book_id, target_folder_id)
}

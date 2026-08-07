use crate::models::{FolderPickerItem, FolderPickerPage};
use crate::repositories::{book_repository, folder_repository, settings_repository};
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

pub fn get_picker_page(
    conn: &Connection,
    parent_id: Option<i64>,
    page: u32,
    page_size: u32,
) -> Result<FolderPickerPage, String> {
    let page_size = page_size.clamp(1, 100);
    let total = folder_repository::count_folder_picker_children(conn, parent_id)? as u32;
    let offset = page * page_size;

    let mut items: Vec<FolderPickerItem> = Vec::new();

    if offset < total {
        let rows = folder_repository::get_folder_picker_rows(conn, parent_id, page_size, offset)?;

        for row in rows {
            items.push(FolderPickerItem {
                id: format!("folder:{}", row.id),
                name: row.name,
                has_children: row.has_children,
            });
        }
    }

    let has_more = offset + page_size < total;

    Ok(FolderPickerPage {
        items,
        total,
        page,
        page_size,
        has_more,
    })
}

fn is_valid_folder_name(name: &str) -> bool {
    let forbidden = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    !name.is_empty()
        && !name.chars().any(|c| forbidden.contains(&c))
        && name != "."
        && name != ".."
}

pub fn create_folder(
    app: &AppHandle,
    conn: &Connection,
    parent_id: Option<i64>,
    name: &str,
) -> Result<(), String> {
    let name = name.trim();

    if !is_valid_folder_name(name) {
        return Err("El nombre de la carpeta no es válido.".to_string());
    }

    if folder_repository::folder_exists_by_name(conn, parent_id, name)? {
        return Err("Ya existe una carpeta con ese nombre en esta ubicación.".to_string());
    }

    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let parent_relative_path = match parent_id {
        Some(id) => folder_repository::get_folder_relative_path(conn, id)?,
        None => String::new(),
    };

    let new_relative_path = if parent_relative_path.is_empty() {
        name.to_string()
    } else {
        format!("{}/{}", parent_relative_path, name)
    };

    let physical_path = root.join(&new_relative_path);

    if physical_path.exists() {
        return Err("La carpeta ya existe en el sistema de archivos.".to_string());
    }

    fs::create_dir(&physical_path)
        .map_err(|e| format!("No se pudo crear la carpeta física: {e}"))?;

    folder_repository::insert_folder(conn, parent_id, name, &new_relative_path)?;

    Ok(())
}

pub fn move_book(
    app: &AppHandle,
    conn: &Connection,
    book_id: i64,
    target_folder_id: Option<i64>,
) -> Result<(), String> {
    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let (current_relative_path, file_name) =
        book_repository::get_book_info_for_move(conn, book_id)?;

    let target_relative_path = match target_folder_id {
        Some(id) => folder_repository::get_folder_relative_path(conn, id)?,
        None => String::new(),
    };

    let new_relative_path = if target_relative_path.is_empty() {
        file_name.clone()
    } else {
        format!("{}/{}", target_relative_path, file_name)
    };

    let old_physical_path = root.join(&current_relative_path);
    let new_physical_path = root.join(&new_relative_path);

    if !old_physical_path.exists() {
        return Err("El archivo del libro no existe en el sistema de archivos.".to_string());
    }

    if new_physical_path.exists() {
        return Err("Ya existe un archivo con ese nombre en la carpeta destino.".to_string());
    }

    fs::rename(&old_physical_path, &new_physical_path)
        .map_err(|e| format!("No se pudo mover el archivo físico: {e}"))?;

    book_repository::update_book_location(
        conn,
        book_id,
        target_folder_id,
        &new_relative_path,
        &file_name,
    )?;

    Ok(())
}
use crate::models::BookPropertiesDto;
use crate::repositories::{book_repository, settings_repository};
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

fn is_valid_file_name(name: &str) -> bool {
    let forbidden = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    !name.is_empty()
        && !name.chars().any(|c| forbidden.contains(&c))
        && !name.starts_with('.')
        && name != "."
        && name != ".."
}

pub fn get_book_properties(
    app: &AppHandle,
    conn: &Connection,
    book_id: i64,
) -> Result<BookPropertiesDto, String> {
    let row = book_repository::get_book_properties(conn, book_id)?
        .ok_or_else(|| "Libro no encontrado.".to_string())?;

    let covers_dir = crate::services::cover_service::covers_dir(app)?;

    let image_url = if row.cover_status == "ready" {
        if let Some(key) = &row.cover_cache_key {
            let path = covers_dir.join(key);
            if path.exists() {
                Some(format!("cover://localhost/{key}"))
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(BookPropertiesDto {
        id: format!("book:{}", row.id),
        title: row.title,
        author: row.author.unwrap_or_default(),
        format: row.format,
        image_url,
        file_name: row.file_name,
        relative_path: row.relative_path,
        folder_name: row.folder_name,
        file_size: row.file_size,
        file_modified_at: row.file_modified_at,
        created_at: row.created_at,
        language: row.language,
        description: row.description,
        publisher: row.publisher,
        published_date: row.published_date,
        cover_status: row.cover_status,
        metadata_status: row.metadata_status,
        is_missing: row.is_missing != 0,
    })
}

pub fn rename_book_file(
    app: &AppHandle,
    conn: &Connection,
    book_id: i64,
    new_file_name: &str,
) -> Result<(), String> {
    let new_file_name = new_file_name.trim();

    if !is_valid_file_name(new_file_name) {
        return Err("El nombre del archivo no es válido.".to_string());
    }

    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let row = book_repository::get_book_properties(conn, book_id)?
        .ok_or_else(|| "Libro no encontrado.".to_string())?;

    // Validar extensión
    let old_ext = Path::new(&row.file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    let new_ext = Path::new(new_file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    if old_ext.to_lowercase() != new_ext.to_lowercase() {
        return Err("No puedes cambiar la extensión del archivo.".to_string());
    }

    if new_file_name == row.file_name {
        return Ok(());
    }

    if book_repository::file_name_exists_in_folder(conn, row.folder_id, new_file_name, book_id)? {
        return Err("Ya existe un archivo con ese nombre en esta carpeta.".to_string());
    }

    // Calcular nueva ruta relativa
    let parent_rel = Path::new(&row.relative_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let new_relative_path = if parent_rel.is_empty() {
        new_file_name.to_string()
    } else {
        format!("{}/{}", parent_rel, new_file_name)
    };

    let old_physical_path = root.join(&row.relative_path);
    let new_physical_path = root.join(&new_relative_path);

    if !old_physical_path.exists() {
        return Err("El archivo no existe en el sistema de archivos.".to_string());
    }

    if new_physical_path.exists() {
        return Err("Ya existe un archivo físico con ese nombre.".to_string());
    }

    fs::rename(&old_physical_path, &new_physical_path)
        .map_err(|e| format!("No se pudo renombrar el archivo: {e}"))?;

    book_repository::update_book_file_name(conn, book_id, new_file_name, &new_relative_path)?;

    Ok(())
}

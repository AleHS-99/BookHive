use crate::models::BookPropertiesDto;
use crate::repositories::{book_repository, settings_repository};
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use tauri::{AppHandle};

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
    _app: &AppHandle,
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

pub fn delete_book(
    app: &AppHandle,
    conn: &Connection,
    book_id: i64,
) -> Result<(), String> {
    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let row = book_repository::get_book_properties(conn, book_id)?
        .ok_or_else(|| "Libro no encontrado.".to_string())?;

    let physical_path = root.join(&row.relative_path);

    // Eliminar cover si existe
    if let Some(cover_key) = &row.cover_cache_key {
        let covers_dir = crate::services::cover_service::covers_dir(app)?;
        let cover_path = covers_dir.join(cover_key);
        let _ = std::fs::remove_file(cover_path);
    }

    // Eliminar archivo físico si existe
    if physical_path.exists() {
        std::fs::remove_file(&physical_path)
            .map_err(|e| format!("No se pudo eliminar el archivo: {e}"))?;
    }

    // Eliminar de la base de datos
    book_repository::delete_book_from_db(conn, book_id)?;

    Ok(())
}

pub fn import_books(
    _app: &AppHandle,
    conn: &Connection,
    file_paths: &[String],
    target_folder_id: Option<i64>,
) -> Result<u32, String> {
    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    // Obtener la ruta relativa de la carpeta destino
    let target_relative_path = match target_folder_id {
        Some(id) => {
            crate::repositories::folder_repository::get_folder_relative_path(conn, id)?
        }
        None => String::new(),
    };

    let target_dir = if target_relative_path.is_empty() {
        root.to_path_buf()
    } else {
        root.join(&target_relative_path)
    };

    // Verificar que la carpeta destino exista
    if !target_dir.exists() {
        return Err("La carpeta destino no existe.".to_string());
    }

    let mut imported_count = 0u32;

    for file_path_str in file_paths {
        let source_path = Path::new(file_path_str);

        // Verificar que el archivo exista
        if !source_path.exists() {
            continue;
        }

        // Verificar que sea epub o pdf
        let extension = source_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        if extension != "epub" && extension != "pdf" {
            continue;
        }

        // Obtener nombre del archivo
        let file_name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "No se pudo obtener el nombre del archivo.".to_string())?
            .to_string();

        // Resolver conflictos de nombre
        let final_file_name = resolve_file_name_conflict(conn, target_folder_id, &file_name)?;

        // Calcular rutas
        let dest_path = target_dir.join(&final_file_name);

        let new_relative_path = if target_relative_path.is_empty() {
            final_file_name.clone()
        } else {
            format!("{}/{}", target_relative_path, final_file_name)
        };

        // Mover el archivo
        std::fs::rename(source_path, &dest_path).or_else(|_| {
            // Si rename falla (cross-device), copiar y eliminar
            std::fs::copy(source_path, &dest_path)
                .and_then(|_| std::fs::remove_file(source_path))
        }).map_err(|e| format!("No se pudo mover el archivo '{}': {}", final_file_name, e))?;

        // Obtener metadata básica del archivo
        let metadata = std::fs::metadata(&dest_path)
            .map_err(|e| format!("No se pudo leer metadata del archivo: {e}"))?;

        let file_size = metadata.len() as i64;

        let file_modified_at = metadata
            .modified()
            .ok()
            .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs().to_string())
            .unwrap_or_default();

        // Título inicial = nombre del archivo sin extensión
        let title = Path::new(&final_file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&final_file_name)
            .to_string();

        let format = if extension == "epub" { "epub" } else { "pdf" };

        // Insertar en la base de datos
        crate::repositories::book_repository::upsert_book(
            conn,
            target_folder_id,
            &new_relative_path,
            &final_file_name,
            format,
            &title,
            file_size,
            &file_modified_at,
        )?;

        imported_count += 1;
    }

    Ok(imported_count)
}

fn resolve_file_name_conflict(
    conn: &Connection,
    folder_id: Option<i64>,
    file_name: &str,
) -> Result<String, String> {
    let exists = crate::repositories::book_repository::file_name_exists_in_folder(
        conn, folder_id, file_name, -1, // -1 = no excluir ningún id
    )?;

    if !exists {
        return Ok(file_name.to_string());
    }

    // Si existe, agregar sufijo numérico
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name);

    let ext = Path::new(file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let mut counter = 1;
    loop {
        let new_name = if ext.is_empty() {
            format!("{} ({})", stem, counter)
        } else {
            format!("{} ({}).{}", stem, counter, ext)
        };

        let exists = crate::repositories::book_repository::file_name_exists_in_folder(
            conn, folder_id, &new_name, -1,
        )?;

        if !exists {
            return Ok(new_name);
        }

        counter += 1;

        if counter > 999 {
            return Err("Demasiados conflictos de nombre.".to_string());
        }
    }
}
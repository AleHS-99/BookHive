use crate::models::{FolderPickerItem, FolderPickerPage};
use crate::repositories::{book_repository, folder_repository, settings_repository};
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use tauri::AppHandle;

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
    !name.is_empty() && !name.chars().any(|c| forbidden.contains(&c)) && name != "." && name != ".."
}

pub fn create_folder(
    _app: &AppHandle,
    conn: &Connection,
    parent_id: Option<i64>,
    name: &str,
) -> Result<i64, String> {
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

    let folder_id = folder_repository::insert_folder(conn, parent_id, name, &new_relative_path)?;

    Ok(folder_id)
}

pub fn move_book(
    _app: &AppHandle,
    conn: &Connection,
    book_id: i64,
    target_folder_id: Option<i64>,
) -> Result<(), String> {
    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    // IMPORTANTE: Ahora devuelve 3 valores:
    // (folder_id, relative_path, file_name)
    let (current_folder_id, current_relative_path, file_name) =
        book_repository::get_book_info_for_move(conn, book_id)?;

    // Si el libro ya está en la carpeta destino, no hacemos nada.
    if current_folder_id == target_folder_id {
        return Ok(());
    }

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

pub fn rename_folder(
    _app: &AppHandle,
    conn: &Connection,
    folder_id: i64,
    new_name: &str,
) -> Result<(), String> {
    let new_name = new_name.trim();

    if !is_valid_folder_name(new_name) {
        return Err("El nombre de la carpeta no es válido.".to_string());
    }

    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let (_id, parent_id, current_name, current_relative_path) =
        folder_repository::get_folder_by_id(conn, folder_id)?
            .ok_or_else(|| "Carpeta no encontrada.".to_string())?;

    if new_name == current_name {
        return Ok(());
    }

    // Verificar que no exista otra carpeta con ese nombre
    if folder_repository::folder_exists_by_name(conn, parent_id, new_name)? {
        return Err("Ya existe una carpeta con ese nombre en esta ubicación.".to_string());
    }

    // Calcular nueva ruta relativa
    let parent_relative_path = match parent_id {
        Some(pid) => folder_repository::get_folder_relative_path(conn, pid)?,
        None => String::new(),
    };

    let new_relative_path = if parent_relative_path.is_empty() {
        new_name.to_string()
    } else {
        format!("{}/{}", parent_relative_path, new_name)
    };

    let old_physical_path = root.join(&current_relative_path);
    let new_physical_path = root.join(&new_relative_path);

    if !old_physical_path.exists() {
        return Err("La carpeta no existe en el sistema de archivos.".to_string());
    }

    if new_physical_path.exists() {
        return Err("Ya existe una carpeta física con ese nombre.".to_string());
    }

    // Renombrar carpeta física
    fs::rename(&old_physical_path, &new_physical_path)
        .map_err(|e| format!("No se pudo renombrar la carpeta: {e}"))?;

    // Actualizar base de datos
    folder_repository::rename_folder_in_db(conn, folder_id, new_name, &new_relative_path)?;

    // Actualizar rutas de todos los hijos
    folder_repository::update_children_paths(conn, &current_relative_path, &new_relative_path)?;

    Ok(())
}

pub fn get_folder_summary(
    conn: &Connection,
    folder_id: i64,
) -> Result<(i64, i64), String> {
    let (_id, _parent_id, _name, relative_path) =
        folder_repository::get_folder_by_id(conn, folder_id)?
            .ok_or_else(|| "Carpeta no encontrada.".to_string())?;

    folder_repository::count_all_children_recursive(conn, folder_id, &relative_path)
}

pub fn delete_folder(
    app: &AppHandle,
    conn: &Connection,
    folder_id: i64,
    force: bool,
) -> Result<(), String> {
    let library_path = settings_repository::get_library_path(conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let root = Path::new(&library_path);

    let (_id, _parent_id, _name, relative_path) =
        folder_repository::get_folder_by_id(conn, folder_id)?
            .ok_or_else(|| "Carpeta no encontrada.".to_string())?;

    // Contar contenido
    let (subfolders, books) =
        folder_repository::count_all_children_recursive(conn, folder_id, &relative_path)?;

    // Si no es force y tiene contenido, retornar error
    if !force && (subfolders > 0 || books > 0) {
        return Err(format!(
            "La carpeta contiene {} subcarpeta(s) y {} libro(s). \
             Usa la opción de eliminar forzosamente para borrar todo el contenido.",
            subfolders, books
        ));
    }

    let physical_path = root.join(&relative_path);

    // Si la carpeta no existe en disco, solo limpiar DB
    if !physical_path.exists() {
        folder_repository::delete_books_in_folder_recursive(conn, &relative_path)?;
        folder_repository::delete_subfolders_recursive(conn, &relative_path)?;
        folder_repository::delete_folder_from_db(conn, folder_id)?;
        return Ok(());
    }

    // Si tiene contenido y es force, eliminar covers primero
    if books > 0 {
        let cover_keys =
            folder_repository::get_all_book_cover_keys_in_folder(conn, &relative_path)?;

        let covers_dir = crate::services::cover_service::covers_dir(app)?;

        for key in cover_keys {
            let cover_path = covers_dir.join(&key);
            let _ = std::fs::remove_file(cover_path);
        }
    }

    // Eliminar carpeta física (recursivamente si tiene contenido)
    if force && (subfolders > 0 || books > 0) {
        std::fs::remove_dir_all(&physical_path)
            .map_err(|e| format!("No se pudo eliminar la carpeta con contenido: {e}"))?;
    } else {
        // Verificar que realmente esté vacía en disco
        let is_empty = std::fs::read_dir(&physical_path)
            .map_err(|e| format!("No se pudo leer la carpeta: {e}"))?
            .next()
            .is_none();

        if !is_empty {
            return Err(
                "La carpeta contiene archivos no registrados. \
                 Elimínalos manualmente o muévelos fuera de la biblioteca."
                    .to_string(),
            );
        }

        std::fs::remove_dir(&physical_path)
            .map_err(|e| format!("No se pudo eliminar la carpeta: {e}"))?;
    }

    // Limpiar base de datos
    folder_repository::delete_books_in_folder_recursive(conn, &relative_path)?;
    folder_repository::delete_subfolders_recursive(conn, &relative_path)?;
    folder_repository::delete_folder_from_db(conn, folder_id)?;

    Ok(())
}
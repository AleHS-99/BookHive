use crate::models::SyncSummary;
use crate::repositories::{book_repository, folder_repository};
use rusqlite::Connection;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

pub fn sync_library(
    conn: &Connection,
    library_root: &Path,
) -> Result<SyncSummary, String> {
    book_repository::mark_all_books_missing(conn)?;

    let existing_folder_ids = folder_repository::get_all_folder_ids(conn)?;
    let mut scanned_folder_ids = HashSet::new();

    let mut summary = SyncSummary {
        folders: 0,
        books: 0,
    };

    scan_dir(
        library_root,
        library_root,
        None,
        conn,
        &mut scanned_folder_ids,
        &mut summary,
    )?;

    for folder_id in existing_folder_ids {
        if !scanned_folder_ids.contains(&folder_id) {
            folder_repository::delete_folder(conn, folder_id)?;
        }
    }

    Ok(summary)
}

fn scan_dir(
    root: &Path,
    dir: &Path,
    parent_id: Option<i64>,
    conn: &Connection,
    scanned_folder_ids: &mut HashSet<i64>,
    summary: &mut SyncSummary,
) -> Result<(), String> {
    let mut entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| format!("No se pudo leer la carpeta de la biblioteca: {e}"))?
        .filter_map(|entry| entry.ok())
        .collect();

    entries.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());

    let mut sort_order: i64 = 0;

    for entry in entries {
        let path = entry.path();

        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();

        if name.starts_with('.') || name.eq_ignore_ascii_case("thumbs.db") {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            let relative_path = relative_path(root, &path)?;

            let folder_id = folder_repository::upsert_folder(
                conn,
                &name,
                &relative_path,
                parent_id,
                sort_order,
            )?;

            scanned_folder_ids.insert(folder_id);
            summary.folders += 1;
            sort_order += 1;

            scan_dir(
                root,
                &path,
                Some(folder_id),
                conn,
                scanned_folder_ids,
                summary,
            )?;
        } else if metadata.is_file() {
            let extension = path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase());

            let format = match extension.as_deref() {
                Some("epub") => "epub",
                Some("pdf") => "pdf",
                _ => continue,
            };

            let relative_path = relative_path(root, &path)?;

            let title = path
                .file_stem()
                .map(|stem| stem.to_string_lossy().to_string())
                .unwrap_or_else(|| name.to_string());

            let file_size = metadata.len() as i64;

            let file_modified_at = metadata
                .modified()
                .ok()
                .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_secs().to_string())
                .unwrap_or_default();

            book_repository::upsert_book(
                conn,
                parent_id,
                &relative_path,
                &name,
                format,
                &title,
                file_size,
                &file_modified_at,
            )?;

            summary.books += 1;
            sort_order += 1;
        }
    }

    Ok(())
}

fn relative_path(root: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(root)
        .map_err(|e| format!("Error calculando ruta relativa: {e}"))?;

    let parts: Vec<String> = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect();

    Ok(parts.join("/"))
}
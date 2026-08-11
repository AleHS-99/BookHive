use crate::models::FolderRow;
use rusqlite::OptionalExtension;
use rusqlite::{params, Connection};

pub fn upsert_folder(
    conn: &Connection,
    name: &str,
    relative_path: &str,
    parent_id: Option<i64>,
    sort_order: i64,
) -> Result<i64, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM folders WHERE relative_path = ?1")
        .map_err(|e| format!("Error preparando consulta de carpeta: {e}"))?;

    let mut rows = stmt
        .query(params![relative_path])
        .map_err(|e| format!("Error consultando carpeta: {e}"))?;

    if let Some(row) = rows
        .next()
        .map_err(|e| format!("Error leyendo carpeta: {e}"))?
    {
        let id: i64 = row
            .get(0)
            .map_err(|e| format!("Error leyendo id de carpeta: {e}"))?;

        conn.execute(
            "UPDATE folders
             SET parent_id = ?1,
                 name = ?2,
                 sort_order = ?3,
                 updated_at = datetime('now')
             WHERE id = ?4",
            params![parent_id, name, sort_order, id],
        )
        .map_err(|e| format!("Error actualizando carpeta: {e}"))?;

        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO folders (parent_id, name, relative_path, sort_order)
             VALUES (?1, ?2, ?3, ?4)",
            params![parent_id, name, relative_path, sort_order],
        )
        .map_err(|e| format!("Error insertando carpeta: {e}"))?;

        Ok(conn.last_insert_rowid())
    }
}

pub fn get_all_folder_ids(conn: &Connection) -> Result<Vec<i64>, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM folders")
        .map_err(|e| format!("Error preparando consulta de ids de carpetas: {e}"))?;

    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Error consultando ids de carpetas: {e}"))?;

    let mut ids = Vec::new();

    for id in rows {
        ids.push(id.map_err(|e| format!("Error leyendo id de carpeta: {e}"))?);
    }

    Ok(ids)
}

pub fn delete_folder(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|e| format!("Error eliminando carpeta: {e}"))?;

    Ok(())
}

pub fn get_all_folders(conn: &Connection) -> Result<Vec<FolderRow>, String> {
    let mut stmt = conn
        .prepare("SELECT id, parent_id, name FROM folders ORDER BY name COLLATE NOCASE")
        .map_err(|e| format!("Error preparando consulta de carpetas: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(FolderRow {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| format!("Error consultando carpetas: {e}"))?;

    let mut folders = Vec::new();

    for folder in rows {
        folders.push(folder.map_err(|e| format!("Error leyendo carpeta: {e}"))?);
    }

    Ok(folders)
}

pub fn count_child_folders(conn: &Connection, parent_id: Option<i64>) -> Result<i64, String> {
    let count = match parent_id {
        Some(id) => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id = ?1",
            params![id],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id IS NULL",
            params![],
            |row| row.get(0),
        ),
    };

    count.map_err(|e| format!("Error contando carpetas hijas: {e}"))
}

pub fn get_child_folders_page(
    conn: &Connection,
    parent_id: Option<i64>,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::models::FolderSummaryRow>, String> {
    let sql = match parent_id {
        Some(_) => {
            "SELECT
                f.id,
                f.parent_id,
                f.name,
                (
                    SELECT COUNT(*)
                    FROM folders c
                    WHERE c.parent_id = f.id
                )
                +
                (
                    SELECT COUNT(*)
                    FROM books b
                    WHERE b.folder_id = f.id
                      AND b.is_missing = 0
                ) AS child_count
             FROM folders f
             WHERE f.parent_id = ?1
             ORDER BY f.name COLLATE NOCASE
             LIMIT ?2 OFFSET ?3"
        }
        None => {
            "SELECT
                f.id,
                f.parent_id,
                f.name,
                (
                    SELECT COUNT(*)
                    FROM folders c
                    WHERE c.parent_id = f.id
                )
                +
                (
                    SELECT COUNT(*)
                    FROM books b
                    WHERE b.folder_id = f.id
                      AND b.is_missing = 0
                ) AS child_count
             FROM folders f
             WHERE f.parent_id IS NULL
             ORDER BY f.name COLLATE NOCASE
             LIMIT ?1 OFFSET ?2"
        }
    };

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("Error preparando consulta de carpetas paginadas: {e}"))?;

    let mapper = |row: &rusqlite::Row| {
        Ok(crate::models::FolderSummaryRow {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            count: row.get(3)?,
        })
    };

    let rows = match parent_id {
        Some(id) => stmt.query_map(params![id, limit, offset], mapper),
        None => stmt.query_map(params![limit, offset], mapper),
    };

    let rows = rows.map_err(|e| format!("Error consultando carpetas paginadas: {e}"))?;

    let mut folders = Vec::new();

    for folder in rows {
        folders.push(folder.map_err(|e| format!("Error leyendo carpeta paginada: {e}"))?);
    }

    Ok(folders)
}

pub fn count_folder_picker_children(
    conn: &Connection,
    parent_id: Option<i64>,
) -> Result<i64, String> {
    let count = match parent_id {
        Some(id) => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id = ?1",
            params![id],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id IS NULL",
            params![],
            |row| row.get(0),
        ),
    };

    count.map_err(|e| format!("Error contando carpetas para picker: {e}"))
}

pub fn get_folder_picker_rows(
    conn: &Connection,
    parent_id: Option<i64>,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::models::FolderPickerRow>, String> {
    let sql = match parent_id {
        Some(_) => {
            "SELECT
                f.id,
                f.name,
                EXISTS(SELECT 1 FROM folders c WHERE c.parent_id = f.id) AS has_children
             FROM folders f
             WHERE f.parent_id = ?1
             ORDER BY f.name COLLATE NOCASE
             LIMIT ?2 OFFSET ?3"
        }
        None => {
            "SELECT
                f.id,
                f.name,
                EXISTS(SELECT 1 FROM folders c WHERE c.parent_id = f.id) AS has_children
             FROM folders f
             WHERE f.parent_id IS NULL
             ORDER BY f.name COLLATE NOCASE
             LIMIT ?1 OFFSET ?2"
        }
    };

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("Error preparando consulta de picker: {e}"))?;

    let mapper = |row: &rusqlite::Row| {
        Ok(crate::models::FolderPickerRow {
            id: row.get(0)?,
            name: row.get(1)?,
            has_children: row.get(2)?,
        })
    };

    let rows = match parent_id {
        Some(id) => stmt.query_map(params![id, limit, offset], mapper),
        None => stmt.query_map(params![limit, offset], mapper),
    };

    let rows = rows.map_err(|e| format!("Error consultando picker: {e}"))?;

    let mut folders = Vec::new();

    for folder in rows {
        folders.push(folder.map_err(|e| format!("Error leyendo carpeta picker: {e}"))?);
    }

    Ok(folders)
}

pub fn get_folder_relative_path(conn: &Connection, id: i64) -> Result<String, String> {
    conn.query_row(
        "SELECT relative_path FROM folders WHERE id = ?1",
        params![id],
        |row| row.get(0),
    )
    .map_err(|e| format!("Error obteniendo ruta relativa de carpeta: {e}"))
}

pub fn folder_exists_by_name(
    conn: &Connection,
    parent_id: Option<i64>,
    name: &str,
) -> Result<bool, String> {
    let count = match parent_id {
        Some(pid) => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id = ?1 AND name = ?2 COLLATE NOCASE",
            params![pid, name],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM folders WHERE parent_id IS NULL AND name = ?1 COLLATE NOCASE",
            params![name],
            |row| row.get(0),
        ),
    };

    count
        .map(|c: i64| c > 0)
        .map_err(|e| format!("Error verificando existencia de carpeta: {e}"))
}

pub fn insert_folder(
    conn: &Connection,
    parent_id: Option<i64>,
    name: &str,
    relative_path: &str,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO folders (parent_id, name, relative_path, sort_order)
         VALUES (?1, ?2, ?3, 0)",
        params![parent_id, name, relative_path],
    )
    .map_err(|e| format!("Error insertando carpeta: {e}"))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_folder_by_id(conn: &Connection, id: i64) -> Result<Option<(i64, Option<i64>, String, String)>, String> {
    conn.query_row(
        "SELECT id, parent_id, name, relative_path FROM folders WHERE id = ?1",
        params![id],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))
        },
    )
    .optional()
    .map_err(|e| format!("Error obteniendo carpeta: {e}"))
}

pub fn rename_folder_in_db(
    conn: &Connection,
    folder_id: i64,
    new_name: &str,
    new_relative_path: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE folders SET name = ?1, relative_path = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![new_name, new_relative_path, folder_id],
    )
    .map_err(|e| format!("Error renombrando carpeta: {e}"))?;

    Ok(())
}

pub fn update_children_paths(
    conn: &Connection,
    old_prefix: &str,
    new_prefix: &str,
) -> Result<(), String> {
    // Actualizar rutas de subcarpetas
    conn.execute(
        "UPDATE folders
         SET relative_path = ?1 || SUBSTR(relative_path, LENGTH(?2) + 1)
         WHERE relative_path LIKE ?2 || '/%'",
        params![new_prefix, old_prefix],
    )
    .map_err(|e| format!("Error actualizando rutas de subcarpetas: {e}"))?;

    // Actualizar rutas de libros
    conn.execute(
        "UPDATE books
         SET relative_path = ?1 || SUBSTR(relative_path, LENGTH(?2) + 1)
         WHERE relative_path LIKE ?2 || '/%'",
        params![new_prefix, old_prefix],
    )
    .map_err(|e| format!("Error actualizando rutas de libros: {e}"))?;

    Ok(())
}

pub fn delete_folder_from_db(conn: &Connection, folder_id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM folders WHERE id = ?1",
        params![folder_id],
    )
    .map_err(|e| format!("Error eliminando carpeta de la base de datos: {e}"))?;

    Ok(())
}

pub fn count_all_children_recursive(
    conn: &Connection,
    _folder_id: i64,
    relative_path: &str,
) -> Result<(i64, i64), String> {
    // Contar subcarpetas recursivas
    let subfolders: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM folders
             WHERE relative_path LIKE ?1 || '/%'",
            params![relative_path],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error contando subcarpetas recursivas: {e}"))?;

    // Contar libros recursivos (en esta carpeta y todas las subcarpetas)
    let books: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM books
             WHERE (relative_path LIKE ?1 || '/%')
               AND is_missing = 0",
            params![relative_path],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error contando libros recursivos: {e}"))?;

    Ok((subfolders, books))
}

pub fn get_all_book_cover_keys_in_folder(
    conn: &Connection,
    relative_path: &str,
) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT cover_cache_key
             FROM books
             WHERE relative_path LIKE ?1 || '/%'
               AND cover_cache_key IS NOT NULL
               AND is_missing = 0",
        )
        .map_err(|e| format!("Error preparando consulta de covers: {e}"))?;

    let rows = stmt
        .query_map(params![relative_path], |row| row.get(0))
        .map_err(|e| format!("Error consultando covers: {e}"))?;

    let mut keys = Vec::new();
    for key in rows {
        keys.push(key.map_err(|e| format!("Error leyendo cover key: {e}"))?);
    }

    Ok(keys)
}

pub fn delete_books_in_folder_recursive(
    conn: &Connection,
    relative_path: &str,
) -> Result<u64, String> {
    let affected = conn
        .execute(
            "DELETE FROM books WHERE relative_path LIKE ?1 || '/%'",
            params![relative_path],
        )
        .map_err(|e| format!("Error eliminando libros recursivamente: {e}"))?;

    Ok(affected as u64)
}

pub fn delete_subfolders_recursive(
    conn: &Connection,
    relative_path: &str,
) -> Result<u64, String> {
    let affected = conn
        .execute(
            "DELETE FROM folders WHERE relative_path LIKE ?1 || '/%'",
            params![relative_path],
        )
        .map_err(|e| format!("Error eliminando subcarpetas recursivamente: {e}"))?;

    Ok(affected as u64)
}
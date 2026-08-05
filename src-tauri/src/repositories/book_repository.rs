use crate::models::{BookRow, PendingCover};
use rusqlite::{params, Connection};

pub fn mark_all_books_missing(conn: &Connection) -> Result<(), String> {
    conn.execute("UPDATE books SET is_missing = 1", params![])
        .map_err(|e| format!("Error marcando libros como missing: {e}"))?;

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn upsert_book(
    conn: &Connection,
    folder_id: Option<i64>,
    relative_path: &str,
    file_name: &str,
    format: &str,
    title: &str,
    file_size: i64,
    file_modified_at: &str,
) -> Result<i64, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM books WHERE relative_path = ?1")
        .map_err(|e| format!("Error preparando consulta de libro: {e}"))?;

    let mut rows = stmt
        .query(params![relative_path])
        .map_err(|e| format!("Error consultando libro: {e}"))?;

    if let Some(row) = rows.next().map_err(|e| format!("Error leyendo libro: {e}"))? {
        let id: i64 = row
            .get(0)
            .map_err(|e| format!("Error leyendo id de libro: {e}"))?;

        conn.execute(
            "UPDATE books
             SET folder_id = ?1,
                 file_name = ?2,
                 format = ?3,
                 title = COALESCE(NULLIF(title, ''), ?4),
                 file_size = ?5,
                 file_modified_at = ?6,
                 is_missing = 0,
                 updated_at = datetime('now')
             WHERE id = ?7",
            params![
                folder_id,
                file_name,
                format,
                title,
                file_size,
                file_modified_at,
                id
            ],
        )
        .map_err(|e| format!("Error actualizando libro: {e}"))?;

        Ok(id)
    } else {
        let cover_status = if format == "epub" { "pending" } else { "none" };

        conn.execute(
            "INSERT INTO books (
                folder_id,
                relative_path,
                file_name,
                format,
                title,
                cover_status,
                file_size,
                file_modified_at,
                is_missing
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)",
            params![
                folder_id,
                relative_path,
                file_name,
                format,
                title,
                cover_status,
                file_size,
                file_modified_at
            ],
        )
        .map_err(|e| format!("Error insertando libro: {e}"))?;

        Ok(conn.last_insert_rowid())
    }
}

pub fn get_visible_books(conn: &Connection) -> Result<Vec<BookRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                id,
                folder_id,
                COALESCE(NULLIF(title, ''), file_name) AS title,
                author,
                format,
                cover_status,
                cover_cache_key
             FROM books
             WHERE is_missing = 0
             ORDER BY title COLLATE NOCASE",
        )
        .map_err(|e| format!("Error preparando consulta de libros: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(BookRow {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                author: row.get(3)?,
                format: row.get(4)?,
                cover_status: row.get(5)?,
                cover_cache_key: row.get(6)?,
            })
        })
        .map_err(|e| format!("Error consultando libros: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo libro: {e}"))?);
    }

    Ok(books)
}

pub fn get_pending_covers(conn: &Connection) -> Result<Vec<PendingCover>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, relative_path, format
             FROM books
             WHERE cover_status = 'pending'
               AND format = 'epub'
               AND is_missing = 0",
        )
        .map_err(|e| format!("Error preparando consulta de portadas pendientes: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PendingCover {
                id: row.get(0)?,
                relative_path: row.get(1)?,
                format: row.get(2)?,
            })
        })
        .map_err(|e| format!("Error consultando portadas pendientes: {e}"))?;

    let mut pending = Vec::new();

    for item in rows {
        pending.push(item.map_err(|e| format!("Error leyendo portada pendiente: {e}"))?);
    }

    Ok(pending)
}

pub fn update_cover_ready(
    conn: &Connection,
    book_id: i64,
    cover_cache_key: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET cover_status = 'ready',
             cover_cache_key = ?1,
             updated_at = datetime('now')
         WHERE id = ?2",
        params![cover_cache_key, book_id],
    )
    .map_err(|e| format!("Error actualizando portada ready: {e}"))?;

    Ok(())
}

pub fn update_cover_failed(conn: &Connection, book_id: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET cover_status = 'failed',
             updated_at = datetime('now')
         WHERE id = ?1",
        params![book_id],
    )
    .map_err(|e| format!("Error actualizando portada failed: {e}"))?;

    Ok(())
}

pub fn reset_epub_covers(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET cover_status = 'pending',
             cover_cache_key = NULL,
             updated_at = datetime('now')
         WHERE format = 'epub'
           AND is_missing = 0",
        params![],
    )
    .map_err(|e| format!("Error reiniciando covers EPUB: {e}"))?;

    Ok(())
}
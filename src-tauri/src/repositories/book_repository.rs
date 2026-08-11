use crate::models::{BookRow, PendingCover};
use rusqlite::{params, Connection};
use rusqlite::OptionalExtension;

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

    if let Some(row) = rows
        .next()
        .map_err(|e| format!("Error leyendo libro: {e}"))?
    {
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
        let metadata_status = if format == "epub" { "pending" } else { "none" };

        conn.execute(
            "INSERT INTO books (
                folder_id,
                relative_path,
                file_name,
                format,
                title,
                cover_status,
                metadata_status,
                file_size,
                file_modified_at,
                is_missing
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)",
            params![
                folder_id,
                relative_path,
                file_name,
                format,
                title,
                cover_status,
                metadata_status,
                file_size,
                file_modified_at
            ],
        )
        .map_err(|e| format!("Error insertando libro: {e}"))?;

        Ok(conn.last_insert_rowid())
    }
}

pub fn get_books_pending_metadata(conn: &Connection) -> Result<Vec<PendingCover>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, relative_path, format
             FROM books
             WHERE metadata_status = 'pending'
               AND format = 'epub'
               AND is_missing = 0",
        )
        .map_err(|e| format!("Error preparando consulta de metadatos pendientes: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PendingCover {
                id: row.get(0)?,
                relative_path: row.get(1)?,
                format: row.get(2)?,
            })
        })
        .map_err(|e| format!("Error consultando metadatos pendientes: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo libro con metadatos pendientes: {e}"))?);
    }

    Ok(books)
}

pub fn update_book_metadata(
    conn: &Connection,
    book_id: i64,
    metadata: &crate::models::BookMetadata,
) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET title = COALESCE(?1, title),
             author = COALESCE(?2, author),
             language = ?3,
             description = ?4,
             publisher = ?5,
             published_date = ?6,
             metadata_status = 'ready',
             updated_at = datetime('now')
         WHERE id = ?7",
        params![
            metadata.title,
            metadata.author,
            metadata.language,
            metadata.description,
            metadata.publisher,
            metadata.published_date,
            book_id
        ],
    )
    .map_err(|e| format!("Error actualizando metadatos: {e}"))?;

    Ok(())
}

pub fn update_metadata_failed(conn: &Connection, book_id: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET metadata_status = 'failed',
             updated_at = datetime('now')
         WHERE id = ?1",
        params![book_id],
    )
    .map_err(|e| format!("Error marcando metadatos como failed: {e}"))?;

    Ok(())
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

pub fn count_child_books(conn: &Connection, parent_id: Option<i64>) -> Result<i64, String> {
    let count = match parent_id {
        Some(id) => conn.query_row(
            "SELECT COUNT(*)
             FROM books
             WHERE folder_id = ?1
               AND is_missing = 0",
            params![id],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*)
             FROM books
             WHERE folder_id IS NULL
               AND is_missing = 0",
            params![],
            |row| row.get(0),
        ),
    };

    count.map_err(|e| format!("Error contando libros hijos: {e}"))
}

pub fn get_child_books_page(
    conn: &Connection,
    parent_id: Option<i64>,
    limit: u32,
    offset: u32,
) -> Result<Vec<BookRow>, String> {
    let sql = match parent_id {
        Some(_) => {
            "SELECT
                id,
                folder_id,
                COALESCE(NULLIF(title, ''), file_name) AS title,
                author,
                format,
                cover_status,
                cover_cache_key,
                language,
                description,
                publisher,
                published_date,
                metadata_status
             FROM books
             WHERE folder_id = ?1
               AND is_missing = 0
             ORDER BY title COLLATE NOCASE
             LIMIT ?2 OFFSET ?3"
        }
        None => {
            "SELECT
                id,
                folder_id,
                COALESCE(NULLIF(title, ''), file_name) AS title,
                author,
                format,
                cover_status,
                cover_cache_key,
                language,
                description,
                publisher,
                published_date,
                metadata_status
             FROM books
             WHERE folder_id IS NULL
               AND is_missing = 0
             ORDER BY title COLLATE NOCASE
             LIMIT ?1 OFFSET ?2"
        }
    };

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("Error preparando consulta de libros paginados: {e}"))?;

    let mapper = |row: &rusqlite::Row| {
        Ok(BookRow {
            id: row.get(0)?,
            folder_id: row.get(1)?,
            title: row.get(2)?,
            author: row.get(3)?,
            format: row.get(4)?,
            cover_status: row.get(5)?,
            cover_cache_key: row.get(6)?,
            language: row.get(7)?,
            description: row.get(8)?,
            publisher: row.get(9)?,
            published_date: row.get(10)?,
            metadata_status: row.get(11)?,
        })
    };

    let rows = match parent_id {
        Some(id) => stmt.query_map(params![id, limit, offset], mapper),
        None => stmt.query_map(params![limit, offset], mapper),
    };

    let rows = rows.map_err(|e| format!("Error consultando libros paginados: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo libro paginado: {e}"))?);
    }

    Ok(books)
}

pub fn get_books_with_cover(
    conn: &Connection,
) -> Result<Vec<crate::models::BookCoverState>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, format, is_missing, cover_cache_key
             FROM books
             WHERE cover_cache_key IS NOT NULL",
        )
        .map_err(|e| format!("Error preparando consulta de books con cover: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(crate::models::BookCoverState {
                id: row.get(0)?,
                format: row.get(1)?,
                is_missing: row.get(2)?,
                cover_cache_key: row.get(3)?,
            })
        })
        .map_err(|e| format!("Error consultando books con cover: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo book con cover: {e}"))?);
    }

    Ok(books)
}

pub fn clear_book_cover(conn: &Connection, book_id: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET cover_cache_key = NULL,
             cover_status = CASE
                 WHEN format = 'epub' THEN 'pending'
                 ELSE 'none'
             END,
             updated_at = datetime('now')
         WHERE id = ?1",
        params![book_id],
    )
    .map_err(|e| format!("Error limpiando cover de libro: {e}"))?;

    Ok(())
}

fn escape_like_query(query: &str) -> String {
    query
        .trim()
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn search_pattern(query: &str) -> String {
    format!("%{}%", escape_like_query(query))
}

pub fn count_search_books(conn: &Connection, query: &str) -> Result<i64, String> {
    let pattern = search_pattern(query);

    let count = conn.query_row(
        "SELECT COUNT(*)
         FROM books
         WHERE is_missing = 0
           AND (
               COALESCE(NULLIF(title, ''), file_name) LIKE ?1 ESCAPE '\\'
               OR COALESCE(author, '') LIKE ?1 ESCAPE '\\'
               OR file_name LIKE ?1 ESCAPE '\\'
           )",
        params![pattern],
        |row| row.get(0),
    );

    count.map_err(|e| format!("Error contando resultados de búsqueda: {e}"))
}

pub fn search_books(
    conn: &Connection,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::models::SearchBookRow>, String> {
    let pattern = search_pattern(query);

    let mut stmt = conn
        .prepare(
            "SELECT
                b.id,
                b.folder_id,
                COALESCE(NULLIF(b.title, ''), b.file_name) AS title,
                b.author,
                b.format,
                b.cover_status,
                b.cover_cache_key,
                f.name AS folder_name
             FROM books b
             LEFT JOIN folders f ON b.folder_id = f.id
             WHERE b.is_missing = 0
               AND (
                   COALESCE(NULLIF(b.title, ''), b.file_name) LIKE ?1 ESCAPE '\\'
                   OR COALESCE(b.author, '') LIKE ?1 ESCAPE '\\'
                   OR b.file_name LIKE ?1 ESCAPE '\\'
               )
             ORDER BY b.title COLLATE NOCASE
             LIMIT ?2 OFFSET ?3",
        )
        .map_err(|e| format!("Error preparando búsqueda de libros: {e}"))?;

    let rows = stmt
        .query_map(params![pattern, limit, offset], |row| {
            Ok(crate::models::SearchBookRow {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                author: row.get(3)?,
                format: row.get(4)?,
                cover_status: row.get(5)?,
                cover_cache_key: row.get(6)?,
                folder_name: row.get(7)?,
            })
        })
        .map_err(|e| format!("Error ejecutando búsqueda de libros: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo libro buscado: {e}"))?);
    }

    Ok(books)
}

pub fn get_book_info_for_move(
    conn: &Connection,
    id: i64,
) -> Result<(Option<i64>, String, String), String> {
    conn.query_row(
        "SELECT folder_id, relative_path, file_name
         FROM books
         WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )
    .map_err(|e| format!("Error obteniendo info de libro para mover: {e}"))
}

pub fn update_book_location(
    conn: &Connection,
    id: i64,
    folder_id: Option<i64>,
    relative_path: &str,
    file_name: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET folder_id = ?1,
             relative_path = ?2,
             file_name = ?3,
             updated_at = datetime('now')
         WHERE id = ?4",
        params![folder_id, relative_path, file_name, id],
    )
    .map_err(|e| format!("Error actualizando ubicación de libro: {e}"))?;

    Ok(())
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
                cover_cache_key,
                language,
                description,
                publisher,
                published_date,
                metadata_status
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
                language: row.get(7)?,
                description: row.get(8)?,
                publisher: row.get(9)?,
                published_date: row.get(10)?,
                metadata_status: row.get(11)?,
            })
        })
        .map_err(|e| format!("Error consultando libros: {e}"))?;

    let mut books = Vec::new();

    for book in rows {
        books.push(book.map_err(|e| format!("Error leyendo libro: {e}"))?);
    }

    Ok(books)
}

#[derive(Debug, Clone)]
pub struct BookPropertiesRow {
    pub id: i64,
    pub folder_id: Option<i64>,
    pub folder_name: Option<String>,
    pub file_name: String,
    pub relative_path: String,
    pub format: String,
    pub title: String,
    pub author: Option<String>,
    pub file_size: i64,
    pub file_modified_at: Option<String>,
    pub created_at: Option<String>,
    pub language: Option<String>,
    pub description: Option<String>,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub cover_status: String,
    pub cover_cache_key: Option<String>,
    pub metadata_status: String,
    pub is_missing: i64,
}

pub fn get_book_properties(
    conn: &Connection,
    id: i64,
) -> Result<Option<BookPropertiesRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                b.id,
                b.folder_id,
                f.name AS folder_name,
                b.file_name,
                b.relative_path,
                b.format,
                COALESCE(NULLIF(b.title, ''), b.file_name) AS title,
                b.author,
                b.file_size,
                b.file_modified_at,
                b.created_at,
                b.language,
                b.description,
                b.publisher,
                b.published_date,
                b.cover_status,
                b.cover_cache_key,
                b.metadata_status,
                b.is_missing
             FROM books b
             LEFT JOIN folders f ON b.folder_id = f.id
             WHERE b.id = ?1",
        )
        .map_err(|e| format!("Error preparando consulta de propiedades: {e}"))?;

    let mut rows = stmt
        .query_map(params![id], |row| {
            Ok(BookPropertiesRow {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                folder_name: row.get(2)?,
                file_name: row.get(3)?,
                relative_path: row.get(4)?,
                format: row.get(5)?,
                title: row.get(6)?,
                author: row.get(7)?,
                file_size: row.get(8)?,
                file_modified_at: row.get(9)?,
                created_at: row.get(10)?,
                language: row.get(11)?,
                description: row.get(12)?,
                publisher: row.get(13)?,
                published_date: row.get(14)?,
                cover_status: row.get(15)?,
                cover_cache_key: row.get(16)?,
                metadata_status: row.get(17)?,
                is_missing: row.get(18)?,
            })
        })
        .map_err(|e| format!("Error consultando propiedades: {e}"))?;

    match rows.next() {
        Some(row) => row
            .map(Some)
            .map_err(|e| format!("Error leyendo propiedades: {e}")),
        None => Ok(None),
    }
}

pub fn update_book_file_name(
    conn: &Connection,
    id: i64,
    new_file_name: &str,
    new_relative_path: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE books
         SET file_name = ?1,
             relative_path = ?2,
             updated_at = datetime('now')
         WHERE id = ?3",
        params![new_file_name, new_relative_path, id],
    )
    .map_err(|e| format!("Error actualizando nombre de archivo: {e}"))?;

    Ok(())
}

pub fn file_name_exists_in_folder(
    conn: &Connection,
    folder_id: Option<i64>,
    file_name: &str,
    exclude_id: i64,
) -> Result<bool, String> {
    let count = match folder_id {
        Some(pid) => conn.query_row(
            "SELECT COUNT(*)
             FROM books
             WHERE folder_id = ?1
               AND file_name = ?2 COLLATE NOCASE
               AND id != ?3
               AND is_missing = 0",
            params![pid, file_name, exclude_id],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*)
             FROM books
             WHERE folder_id IS NULL
               AND file_name = ?1 COLLATE NOCASE
               AND id != ?2
               AND is_missing = 0",
            params![file_name, exclude_id],
            |row| row.get(0),
        ),
    };

    count
        .map(|c: i64| c > 0)
        .map_err(|e| format!("Error verificando nombre de archivo: {e}"))
}

pub fn get_book_relative_path(conn: &Connection, id: i64) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT relative_path FROM books WHERE id = ?1",
        params![id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("Error obteniendo ruta de libro: {e}"))
}


pub fn delete_book_from_db(conn: &Connection, id: i64) -> Result<u64, String> {
    let affected = conn
        .execute("DELETE FROM books WHERE id = ?1", params![id])
        .map_err(|e| format!("Error eliminando libro de la base de datos: {e}"))?;

    Ok(affected as u64)
}
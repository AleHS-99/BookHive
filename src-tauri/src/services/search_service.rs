use crate::models::{SearchBookDto, SearchBookRow, SearchPage};
use crate::repositories::book_repository;
use rusqlite::Connection;
use std::path::Path;

pub fn search_books(
    conn: &Connection,
    covers_dir: &Path,
    query: &str,
    page: u32,
    page_size: u32,
) -> Result<SearchPage, String> {
    let query = query.trim();
    let page_size = page_size.clamp(1, 100);

    if query.is_empty() {
        return Ok(SearchPage {
            items: Vec::new(),
            total: 0,
            page,
            page_size,
            has_more: false,
        });
    }

    let total = book_repository::count_search_books(conn, query)? as u32;
    let offset = page * page_size;

    let mut items: Vec<SearchBookDto> = Vec::new();

    if offset < total {
        let rows = book_repository::search_books(conn, query, page_size, offset)?;

        for row in rows {
            let image_url = resolve_cover_url(&row, covers_dir);

            items.push(SearchBookDto {
                id: format!("book:{}", row.id),
                title: row.title,
                author: row.author.unwrap_or_default(),
                format: row.format,
                image_url,
                folder_name: row.folder_name,
            });
        }
    }

    let has_more = offset + page_size < total;

    Ok(SearchPage {
        items,
        total,
        page,
        page_size,
        has_more,
    })
}

fn resolve_cover_url(row: &SearchBookRow, covers_dir: &Path) -> Option<String> {
    if row.cover_status != "ready" {
        return None;
    }

    let key = row.cover_cache_key.as_ref()?;
    let path = covers_dir.join(key);

    if !path.exists() {
        return None;
    }

    Some(format!("cover://localhost/{key}"))
}

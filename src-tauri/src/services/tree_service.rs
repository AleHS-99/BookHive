use crate::models::{BookDto, BookRow, FolderDto, FolderRow, TreeNodeDto};
use crate::repositories::{book_repository, folder_repository};
use rusqlite::Connection;
use std::collections::HashMap;
use std::path::Path;

pub fn build_root_tree(conn: &Connection, covers_dir: &Path) -> Result<FolderDto, String> {
    let folders = folder_repository::get_all_folders(conn)?;
    let books = book_repository::get_visible_books(conn)?;

    let mut folders_by_parent: HashMap<Option<i64>, Vec<FolderRow>> = HashMap::new();
    let mut books_by_folder: HashMap<Option<i64>, Vec<BookRow>> = HashMap::new();

    for folder in folders {
        folders_by_parent
            .entry(folder.parent_id)
            .or_default()
            .push(folder);
    }

    for book in books {
        books_by_folder
            .entry(book.folder_id)
            .or_default()
            .push(book);
    }

    for folder_list in folders_by_parent.values_mut() {
        folder_list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    }

    for book_list in books_by_folder.values_mut() {
        book_list.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    }

    let root_children = build_children(None, &folders_by_parent, &books_by_folder, covers_dir);

    Ok(FolderDto {
        id: "root".to_string(),
        name: "Root".to_string(),
        folder_type: "folder".to_string(),
        count: root_children.len(),
        children: root_children,
    })
}

fn build_children(
    parent_id: Option<i64>,
    folders_by_parent: &HashMap<Option<i64>, Vec<FolderRow>>,
    books_by_folder: &HashMap<Option<i64>, Vec<BookRow>>,
    covers_dir: &Path,
) -> Vec<TreeNodeDto> {
    let mut children: Vec<TreeNodeDto> = Vec::new();

    if let Some(folders) = folders_by_parent.get(&parent_id) {
        for folder in folders {
            let folder_dto = build_folder(
                folder.id,
                folder.name.clone(),
                folders_by_parent,
                books_by_folder,
                covers_dir,
            );

            children.push(TreeNodeDto::Folder(folder_dto));
        }
    }

    if let Some(books) = books_by_folder.get(&parent_id) {
        for book in books {
            let image_url = resolve_cover_url(book, covers_dir);

            let book_dto = BookDto {
                id: format!("book:{}", book.id),
                title: book.title.clone(),
                author: book.author.clone().unwrap_or_default(),
                format: book.format.clone(),
                image_url,
            };

            children.push(TreeNodeDto::Book(book_dto));
        }
    }

    children
}

fn build_folder(
    folder_id: i64,
    name: String,
    folders_by_parent: &HashMap<Option<i64>, Vec<FolderRow>>,
    books_by_folder: &HashMap<Option<i64>, Vec<BookRow>>,
    covers_dir: &Path,
) -> FolderDto {
    let children = build_children(
        Some(folder_id),
        folders_by_parent,
        books_by_folder,
        covers_dir,
    );

    FolderDto {
        id: format!("folder:{folder_id}"),
        name,
        folder_type: "folder".to_string(),
        count: children.len(),
        children,
    }
}

fn resolve_cover_url(book: &BookRow, covers_dir: &Path) -> Option<String> {
    if book.cover_status != "ready" {
        return None;
    }

    let key = book.cover_cache_key.as_ref()?;
    let path = covers_dir.join(key);

    if !path.exists() {
        return None;
    }

    Some(format!("cover://localhost/{key}"))
}

pub fn get_folder_page(
    conn: &Connection,
    covers_dir: &Path,
    parent_id: Option<i64>,
    page: u32,
    page_size: u32,
) -> Result<crate::models::PaginatedTreePage, String> {
    let page_size = page_size.clamp(1, 100);

    let folder_count = folder_repository::count_child_folders(conn, parent_id)? as u32;

    let book_count = book_repository::count_child_books(conn, parent_id)? as u32;

    let total = folder_count + book_count;
    let offset = page * page_size;

    let mut items: Vec<TreeNodeDto> = Vec::new();

    if offset < total {
        let mut remaining = page_size;

        // Primero carpetas
        if offset < folder_count {
            let limit = std::cmp::min(remaining, folder_count - offset);

            let folders =
                folder_repository::get_child_folders_page(conn, parent_id, limit, offset)?;

            for folder in folders {
                items.push(TreeNodeDto::Folder(FolderDto {
                    id: format!("folder:{}", folder.id),
                    name: folder.name,
                    folder_type: "folder".to_string(),
                    count: folder.count.max(0) as usize,
                    children: Vec::new(),
                }));
            }

            remaining -= limit;
        }

        // Luego libros
        if remaining > 0 {
            let book_offset = if offset > folder_count {
                offset - folder_count
            } else {
                0
            };

            let books =
                book_repository::get_child_books_page(conn, parent_id, remaining, book_offset)?;

            for book in books {
                let image_url = resolve_cover_url(&book, covers_dir);

                items.push(TreeNodeDto::Book(BookDto {
                    id: format!("book:{}", book.id),
                    title: book.title.clone(),
                    author: book.author.clone().unwrap_or_default(),
                    format: book.format.clone(),
                    image_url,
                }));
            }
        }
    }

    let has_more = offset + page_size < total;

    Ok(crate::models::PaginatedTreePage {
        items,
        total,
        page,
        page_size,
        has_more,
    })
}

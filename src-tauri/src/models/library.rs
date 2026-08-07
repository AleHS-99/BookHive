use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub library_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStatus {
    pub configured: bool,
    pub library_path: Option<String>,
    pub is_empty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncSummary {
    pub folders: u32,
    pub books: u32,
}

#[derive(Debug, Clone)]
pub struct FolderRow {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct BookRow {
    pub id: i64,
    pub folder_id: Option<i64>,
    pub title: String,
    pub author: Option<String>,
    pub format: String,
    pub cover_status: String,
    pub cover_cache_key: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PendingCover {
    pub id: i64,
    pub relative_path: String,
    pub format: String,
}

#[derive(Debug, Clone)]
pub struct FolderSummaryRow {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone)]
pub struct BookCoverState {
    pub id: i64,
    pub format: String,
    pub is_missing: i64,
    pub cover_cache_key: String,
}
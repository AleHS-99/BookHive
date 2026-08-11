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
    #[allow(dead_code)]
    pub language: Option<String>,
    #[allow(dead_code)]
    pub description: Option<String>,
    #[allow(dead_code)]
    pub publisher: Option<String>,
    #[allow(dead_code)]
    pub published_date: Option<String>,
    #[allow(dead_code)]
    pub metadata_status: String,
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
    #[allow(dead_code)]
    pub parent_id: Option<i64>,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone)]
pub struct BookCoverState {
    pub id: i64,
    #[allow(dead_code)]
    pub format: String,
    pub is_missing: i64,
    pub cover_cache_key: String,
}

#[derive(Debug, Clone)]
pub struct FolderPickerRow {
    pub id: i64,
    pub name: String,
    pub has_children: bool,
}

#[derive(Debug, Clone)]
pub struct BookMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub language: Option<String>,
    pub description: Option<String>,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookPropertiesDto {
    pub id: String,
    pub title: String,
    pub author: String,
    pub format: String,

    #[serde(rename = "imageUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    pub file_name: String,
    pub relative_path: String,
    pub folder_name: Option<String>,

    #[serde(rename = "fileSize")]
    pub file_size: i64,
    #[serde(rename = "fileModifiedAt")]
    pub file_modified_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,

    pub language: Option<String>,
    pub description: Option<String>,
    pub publisher: Option<String>,
    #[serde(rename = "publishedDate")]
    pub published_date: Option<String>,

    #[serde(rename = "coverStatus")]
    pub cover_status: String,
    #[serde(rename = "metadataStatus")]
    pub metadata_status: String,
    #[serde(rename = "isMissing")]
    pub is_missing: bool,
}

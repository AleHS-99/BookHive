use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverBookSummary {
    pub id: String,
    pub title: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,

    #[serde(rename = "coverUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,

    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverCategory {
    pub name: String,
    pub path: String,
}

/// Un enlace de descarga disponible para el libro (EPUB, PDF, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadLink {
    pub label: String,
    pub format: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverBookDetail {
    pub title: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,

    #[serde(rename = "coverUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub synopsis: Option<String>,

    #[serde(rename = "downloadLinks")]
    pub download_links: Vec<DownloadLink>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverPage<T> {
    pub items: Vec<T>,
    pub page: u32,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverHome {
    pub novelties: Vec<DiscoverBookSummary>,
    pub most_read: Vec<DiscoverBookSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    pub file_name: String,
    pub bytes: u64,
    pub saved_path: String,
}
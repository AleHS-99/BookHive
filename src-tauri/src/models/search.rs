use serde::Serialize;

#[derive(Debug, Clone)]
pub struct SearchBookRow {
    pub id: i64,
    #[allow(dead_code)]
    pub folder_id: Option<i64>,
    pub title: String,
    pub author: Option<String>,
    pub format: String,
    pub cover_status: String,
    pub cover_cache_key: Option<String>,
    pub folder_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBookDto {
    pub id: String,
    pub title: String,
    pub author: String,
    pub format: String,

    #[serde(rename = "imageUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    pub folder_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchPage {
    pub items: Vec<SearchBookDto>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

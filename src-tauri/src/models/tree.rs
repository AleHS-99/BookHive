use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct BookDto {
    pub id: String,
    pub title: String,
    pub author: String,
    pub format: String,

    #[serde(rename = "imageUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FolderDto {
    pub id: String,
    pub name: String,

    #[serde(rename = "type")]
    pub folder_type: String,

    pub count: usize,
    pub children: Vec<TreeNodeDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum TreeNodeDto {
    Folder(FolderDto),
    Book(BookDto),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedTreePage {
    pub items: Vec<TreeNodeDto>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPickerItem {
    pub id: String,
    pub name: String,
    pub has_children: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPickerPage {
    pub items: Vec<FolderPickerItem>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}
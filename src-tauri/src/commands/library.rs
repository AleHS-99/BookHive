use crate::services::library_service;

#[tauri::command]
pub fn validate_empty_library_folder(path: String) -> Result<(), String> {
    let path_buf = library_service::normalize_path(&path);
    library_service::validate_empty_folder(&path_buf)
}
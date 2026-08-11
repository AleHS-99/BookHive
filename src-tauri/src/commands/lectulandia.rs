use crate::db::Db;
use crate::models::{
    DiscoverBookDetail, DiscoverBookSummary, DiscoverCategory, DiscoverHome, DiscoverPage,
    DownloadResult,
};
use crate::repositories::settings_repository;
use crate::services::book_service;
use crate::services::lectulandia;
use std::path::PathBuf;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn discover_home() -> Result<DiscoverHome, String> {
    lectulandia::fetch_home().await
}

#[tauri::command]
pub async fn discover_categories() -> Result<Vec<DiscoverCategory>, String> {
    lectulandia::get_categories().await
}

#[tauri::command]
pub async fn discover_search(
    query: String,
    page: u32,
) -> Result<DiscoverPage<DiscoverBookSummary>, String> {
    lectulandia::search_books(&query, page).await
}

#[tauri::command]
pub async fn discover_category_books(
    path: String,
    page: u32,
) -> Result<DiscoverPage<DiscoverBookSummary>, String> {
    lectulandia::get_category_books(&path, page).await
}

#[tauri::command]
pub async fn discover_book_detail(url: String) -> Result<DiscoverBookDetail, String> {
    lectulandia::get_book_detail(&url).await
}

#[tauri::command]
pub async fn discover_download_book(
    db: State<'_, Db>,
    _app: AppHandle,
    book_url: String,
) -> Result<DownloadResult, String> {
    // 1) Obtener detalle para llegar al download_page_url.
    let detail = lectulandia::get_book_detail(&book_url).await?;

    // 2) Resolver el link directo.
    let http = lectulandia::client::build_client()?;
    let (file_name, direct_url) =
        lectulandia::download::resolve_download(&http, &detail.download_page_url).await?;

    // 3) Descargar a un archivo temporal.
    let temp_dir = std::env::temp_dir();
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let temp_path = temp_dir.join(format!("bookhive_{unique}_{file_name}"));

    let bytes = lectulandia::download::download_to_file(&http, &direct_url, &temp_path).await?;

    // 4) Importar a la biblioteca (raíz) reutilizando la lógica existente.
    let conn = db
        .0
        .lock()
        .map_err(|e| format!("Error bloqueando la base de datos: {e}"))?;

    let temp_str = temp_path
        .to_str()
        .ok_or_else(|| "Ruta temporal inválida.".to_string())?
        .to_string();

    let imported = book_service::import_books(&_app, &conn, &[temp_str], None)?;

    if imported == 0 {
        return Err("El archivo se descargó pero no se pudo importar.".to_string());
    }

    let library_path = settings_repository::get_library_path(&conn)?
        .ok_or_else(|| "No hay carpeta de biblioteca configurada.".to_string())?;

    let saved_path: PathBuf = PathBuf::from(library_path).join(&file_name);

    Ok(DownloadResult {
        file_name,
        bytes,
        saved_path: saved_path.to_string_lossy().to_string(),
    })
}
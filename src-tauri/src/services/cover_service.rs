use epub::doc::EpubDoc;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use webp::Encoder;

pub const COVER_CACHE_VERSION: &str = "2";

const COVER_MAX_WIDTH: u32 = 240;
const COVER_MAX_HEIGHT: u32 = 360;
const COVER_WEBP_QUALITY: f32 = 55.0;

pub fn covers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener app_data_dir: {e}"))?
        .join("covers");

    fs::create_dir_all(&dir)
        .map_err(|e| format!("No se pudo crear la carpeta de portadas: {e}"))?;

    Ok(dir)
}

pub fn clear_covers_dir(dir: &Path) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("No se pudo leer la carpeta de covers: {e}"))?;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.is_file() {
            let _ = fs::remove_file(path);
        }
    }

    Ok(())
}

pub fn generate_epub_cover(
    library_root: &Path,
    relative_path: &str,
    covers_dir: &Path,
    book_id: i64,
) -> Result<String, String> {
    let book_path = library_root.join(relative_path);

    if !book_path.exists() {
        return Err("El archivo EPUB no existe.".to_string());
    }

    let book_path_str = book_path
        .to_str()
        .ok_or_else(|| "Ruta EPUB no válida.".to_string())?;

    let mut doc = EpubDoc::new(book_path_str)
        .map_err(|e| format!("Error abriendo EPUB: {e:?}"))?;

    let cover_id = doc
        .get_cover_id()
        .map(|id| id.to_string())
        .ok_or_else(|| "El EPUB no tiene cover_id.".to_string())?;

    let (cover_bytes, _mime) = doc
        .get_resource(&cover_id)
        .ok_or_else(|| "No se pudo obtener la portada del EPUB.".to_string())?;

    let img = image::load_from_memory(&cover_bytes)
        .map_err(|e| format!("Error decodificando imagen: {e}"))?;

    let thumbnail = img.thumbnail(COVER_MAX_WIDTH, COVER_MAX_HEIGHT);

    let encoder = Encoder::from_image(&thumbnail)
        .map_err(|e| format!("Error creando encoder WebP: {e:?}"))?;

    let encoded = encoder.encode(COVER_WEBP_QUALITY);

    let file_name = format!("{book_id}.webp");
    let out_path = covers_dir.join(&file_name);

    fs::write(&out_path, encoded.to_vec())
        .map_err(|e| format!("Error guardando portada WebP: {e}"))?;

    Ok(file_name)
}
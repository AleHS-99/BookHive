use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub fn normalize_path(path: &str) -> PathBuf {
    PathBuf::from(path.trim())
}

pub fn validate_folder(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty() {
        return Err("La ruta está vacía.".to_string());
    }

    if !path.exists() {
        return Err("La ruta seleccionada no existe.".to_string());
    }

    if !path.is_dir() {
        return Err("La ruta seleccionada no es una carpeta.".to_string());
    }

    Ok(())
}

pub fn is_dir_empty(path: &Path) -> Result<bool, String> {
    validate_folder(path)?;

    let entries = fs::read_dir(path)
        .map_err(|e| format!("No se pudo leer la carpeta seleccionada: {e}"))?;

    for entry in entries {
        let entry = entry
            .map_err(|e| format!("Error leyendo entrada de carpeta: {e}"))?;

        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();

        // Ignorar archivos ocultos y archivos comunes del sistema.
        if file_name.starts_with('.') || file_name.eq_ignore_ascii_case("thumbs.db") {
            continue;
        }

        return Ok(false);
    }

    Ok(true)
}

pub fn validate_empty_folder(path: &Path) -> Result<(), String> {
    validate_folder(path)?;

    if !is_dir_empty(path)? {
        return Err("Por ahora la carpeta seleccionada debe estar vacía.".to_string());
    }

    Ok(())
}

pub fn default_library_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(document_dir) = app.path().document_dir() {
        if document_dir.exists() {
            let bookhive_dir = document_dir.join("BookHive");

            if bookhive_dir.exists() {
                return Ok(bookhive_dir);
            }

            return Ok(document_dir);
        }
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener app_data_dir: {e}"))?;

    Ok(app_data_dir.join("library"))
}
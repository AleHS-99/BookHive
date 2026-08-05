pub mod migrations;

use rusqlite::Connection;
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Db(pub Arc<Mutex<Connection>>);

pub fn init(app_data_dir: &Path) -> Result<Db, String> {
    fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("No se pudo crear el directorio de datos: {e}"))?;

    let db_path = app_data_dir.join("bookhive.db");

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("No se pudo abrir la base de datos SQLite: {e}"))?;

    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| format!("No se pudo activar foreign_keys: {e}"))?;

    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("No se pudo activar WAL: {e}"))?;

    migrations::run(&conn)?;

    Ok(Db(Arc::new(Mutex::new(conn))))
}
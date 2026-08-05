use rusqlite::{params, Connection};

const LIBRARY_PATH_KEY: &str = "library_path";

pub fn get_library_path(conn: &Connection) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| format!("Error preparando consulta de settings: {e}"))?;

    let mut rows = stmt
        .query(params![LIBRARY_PATH_KEY])
        .map_err(|e| format!("Error consultando settings: {e}"))?;

    match rows.next().map_err(|e| format!("Error leyendo settings: {e}"))? {
        Some(row) => {
            let value: String = row
                .get(0)
                .map_err(|e| format!("Error leyendo library_path: {e}"))?;

            Ok(Some(value))
        }
        None => Ok(None),
    }
}

pub fn set_library_path(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![LIBRARY_PATH_KEY, path],
    )
    .map_err(|e| format!("Error guardando library_path: {e}"))?;

    Ok(())
}
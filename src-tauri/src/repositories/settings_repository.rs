use rusqlite::{params, Connection};

const LIBRARY_PATH_KEY: &str = "library_path";

pub fn get_library_path(conn: &Connection) -> Result<Option<String>, String> {
    get_setting(conn, LIBRARY_PATH_KEY)
}

pub fn set_library_path(conn: &Connection, path: &str) -> Result<(), String> {
    set_setting(conn, LIBRARY_PATH_KEY, path)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| format!("Error preparando consulta de settings: {e}"))?;

    let mut rows = stmt
        .query(params![key])
        .map_err(|e| format!("Error consultando settings: {e}"))?;

    match rows.next().map_err(|e| format!("Error leyendo settings: {e}"))? {
        Some(row) => {
            let value: String = row
                .get(0)
                .map_err(|e| format!("Error leyendo setting: {e}"))?;

            Ok(Some(value))
        }
        None => Ok(None),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("Error guardando setting: {e}"))?;

    Ok(())
}
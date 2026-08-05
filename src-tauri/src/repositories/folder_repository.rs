use crate::models::FolderRow;
use rusqlite::{params, Connection};

pub fn upsert_folder(
    conn: &Connection,
    name: &str,
    relative_path: &str,
    parent_id: Option<i64>,
    sort_order: i64,
) -> Result<i64, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM folders WHERE relative_path = ?1")
        .map_err(|e| format!("Error preparando consulta de carpeta: {e}"))?;

    let mut rows = stmt
        .query(params![relative_path])
        .map_err(|e| format!("Error consultando carpeta: {e}"))?;

    if let Some(row) = rows.next().map_err(|e| format!("Error leyendo carpeta: {e}"))? {
        let id: i64 = row
            .get(0)
            .map_err(|e| format!("Error leyendo id de carpeta: {e}"))?;

        conn.execute(
            "UPDATE folders
             SET parent_id = ?1,
                 name = ?2,
                 sort_order = ?3,
                 updated_at = datetime('now')
             WHERE id = ?4",
            params![parent_id, name, sort_order, id],
        )
        .map_err(|e| format!("Error actualizando carpeta: {e}"))?;

        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO folders (parent_id, name, relative_path, sort_order)
             VALUES (?1, ?2, ?3, ?4)",
            params![parent_id, name, relative_path, sort_order],
        )
        .map_err(|e| format!("Error insertando carpeta: {e}"))?;

        Ok(conn.last_insert_rowid())
    }
}

pub fn get_all_folder_ids(conn: &Connection) -> Result<Vec<i64>, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM folders")
        .map_err(|e| format!("Error preparando consulta de ids de carpetas: {e}"))?;

    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Error consultando ids de carpetas: {e}"))?;

    let mut ids = Vec::new();

    for id in rows {
        ids.push(id.map_err(|e| format!("Error leyendo id de carpeta: {e}"))?);
    }

    Ok(ids)
}

pub fn delete_folder(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|e| format!("Error eliminando carpeta: {e}"))?;

    Ok(())
}

pub fn get_all_folders(conn: &Connection) -> Result<Vec<FolderRow>, String> {
    let mut stmt = conn
        .prepare("SELECT id, parent_id, name FROM folders ORDER BY name COLLATE NOCASE")
        .map_err(|e| format!("Error preparando consulta de carpetas: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(FolderRow {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| format!("Error consultando carpetas: {e}"))?;

    let mut folders = Vec::new();

    for folder in rows {
        folders.push(folder.map_err(|e| format!("Error leyendo carpeta: {e}"))?);
    }

    Ok(folders)
}
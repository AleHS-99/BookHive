use rusqlite::Connection;

const MIGRATION_0001: &str = include_str!("migrations/0001_init.sql");
const MIGRATION_0002: &str = include_str!("migrations/0002_add_metadata.sql");

pub fn run(conn: &Connection) -> Result<(), String> {
    let version = get_user_version(conn)?;

    if version < 1 {
        apply_migration(conn, MIGRATION_0001, 1)?;
    }

    if version < 2 {
        apply_migration(conn, MIGRATION_0002, 2)?;
    }

    Ok(())
}

fn get_user_version(conn: &Connection) -> Result<i32, String> {
    conn.pragma_query_value(None, "user_version", |row| row.get::<_, i32>(0))
        .map_err(|e| format!("Error leyendo user_version: {e}"))
}

fn apply_migration(conn: &Connection, sql: &str, version: i32) -> Result<(), String> {
    conn.execute_batch(sql)
        .map_err(|e| format!("Error ejecutando migración {version}: {e}"))?;

    conn.pragma_update(None, "user_version", version)
        .map_err(|e| format!("No se pudo actualizar user_version a {version}: {e}"))?;

    Ok(())
}

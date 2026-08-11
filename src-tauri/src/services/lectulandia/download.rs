use futures_util::StreamExt;
use reqwest::header::{HeaderValue, REFERER};
use scraper::{Html, Selector};
use std::path::Path;
use std::time::Duration;
use tokio::io::AsyncWriteExt;

use super::client;

const ANTUPLOAD_BASE: &str = "https://www.antupload.com";

/// Resuelve el link directo de descarga y el nombre del archivo.
/// Devuelve: (filename, direct_url, referer_url)
pub async fn resolve_download(
    http: &reqwest::Client,
    download_page_url: &str,
) -> Result<(String, String, String), String> {
    // 1) Página de descarga de lectulandia → extraer linkCode del script.
    let download_page_html = client::get_html(http, download_page_url).await?;
    let link_code = extract_link_code(&download_page_html)
        .ok_or_else(|| "No se encontró la variable linkCode.".to_string())?;

    let antupload_file_url = format!("{ANTUPLOAD_BASE}/file/{link_code}");

    // 2) Página de antupload → link #fileDownload.
    let ant_html = client::get_html(http, &antupload_file_url).await?;
    let rel = extract_file_download_href(&ant_html)
        .ok_or_else(|| "No se encontró #fileDownload en antupload.".to_string())?;

    let download_b_page_url = format!("{ANTUPLOAD_BASE}{rel}");

    // 3) Página con el botón #downloadB → nombre de archivo + link final.
    let b_html = client::get_html(http, &download_b_page_url).await?;
    let (filename, final_href) = extract_download_b_info(&b_html)
        .ok_or_else(|| "No se pudo extraer la información de #downloadB.".to_string())?;

    let direct_url = if final_href.starts_with("http") {
        final_href
    } else {
        format!("{ANTUPLOAD_BASE}{final_href}")
    };

    // Pequeño delay como en el Python original para que el servidor procese la sesión.
    tokio::time::sleep(Duration::from_secs(2)).await;

    Ok((filename, direct_url, download_b_page_url))
}

/// Extrae `var linkCode = "..."` del HTML.
fn extract_link_code(html: &str) -> Option<String> {
    let doc = Html::parse_document(html);
    let script_sel = Selector::parse("script").ok()?;

    for script in doc.select(&script_sel) {
        let content = script.text().collect::<String>();

        for line in content.lines() {
            if line.contains("var linkCode") {
                if let Some(value) = line.split('=').nth(1) {
                    let cleaned = value
                        .trim()
                        .trim_end_matches(';')
                        .trim_matches('"')
                        .trim_matches('\'')
                        .trim()
                        .to_string();

                    if !cleaned.is_empty() {
                        return Some(cleaned);
                    }
                }
            }
        }
    }

    None
}

/// Extrae el href de #fileDownload (página de antupload).
fn extract_file_download_href(html: &str) -> Option<String> {
    let doc = Html::parse_document(html);
    let sel = Selector::parse("#fileDownload a").ok()?;

    doc.select(&sel)
        .next()
        .and_then(|a| a.value().attr("href"))
        .map(|s| s.to_string())
}

/// Extrae el nombre del archivo y el link #downloadB.
/// Devuelve (filename, final_href).
fn extract_download_b_info(html: &str) -> Option<(String, String)> {
    let doc = Html::parse_document(html);

    let filename_sel = Selector::parse("#fileDescription p").ok()?;
    let filename = doc
        .select(&filename_sel)
        .nth(1)
        .map(|p| p.text().collect::<String>())
        .map(|t| t.replace("Name:", "").replace("Name: ", "").trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "libro".to_string());

    let downloadb_sel = Selector::parse("a#downloadB").ok()?;
    let href = doc
        .select(&downloadb_sel)
        .next()
        .and_then(|a| a.value().attr("href"))?;

    Some((filename, href.to_string()))
}

/// Descarga un archivo por streaming a `dest`. Devuelve los bytes escritos.
/// `referer` es la URL de la página anterior (necesario para antupload).
pub async fn download_to_file(
    http: &reqwest::Client,
    url: &str,
    referer: &str,
    dest: &Path,
) -> Result<u64, String> {
    let referer_value = HeaderValue::from_str(referer)
        .map_err(|e| format!("Referer inválido: {e}"))?;

    let resp = http
        .get(url)
        .header(REFERER, referer_value)
        .send()
        .await
        .map_err(|e| format!("Error iniciando descarga: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("La descarga respondió con estado {}", resp.status()));
    }

    // Validar Content-Type: si viene HTML, algo falló (probablemente falta un paso o anti-hotlink).
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if content_type.contains("text/html") {
        return Err(format!(
            "El servidor devolvió HTML en lugar del archivo. Content-Type: {content_type}. \
            Es posible que el sitio bloquee descargas directas o requiera un paso adicional."
        ));
    }

    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("No se pudo crear el archivo destino: {e}"))?;

    let mut stream = resp.bytes_stream();
    let mut total = 0u64;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error en el stream de descarga: {e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Error escribiendo el archivo: {e}"))?;
        total += chunk.len() as u64;
    }

    file.flush()
        .await
        .map_err(|e| format!("Error cerrando el archivo: {e}"))?;

    // Validación extra: si el archivo es sospechosamente pequeño (<1KB), probablemente no sea un libro.
    if total < 1024 {
        let _ = tokio::fs::remove_file(dest).await;
        return Err(format!(
            "El archivo descargado es demasiado pequeño ({total} bytes). \
            Es posible que el sitio haya devuelto una página de error."
        ));
    }

    Ok(total)
}
use scraper::{Html, Selector};

use crate::models::{DiscoverBookDetail, DiscoverBookSummary, DiscoverCategory, DownloadLink};
use super::client::to_absolute_url;

fn sel(css: &str) -> Selector {
    Selector::parse(css).unwrap_or_else(|_| panic!("Selector CSS inválido: {css}"))
}

fn slug_from_url(url: &str) -> String {
    url.trim_matches('/').replace('/', "-")
}

fn text_of(el: &scraper::ElementRef) -> String {
    el.text().collect::<String>().trim().to_string()
}

/// Detecta el formato de un enlace de descarga según su texto o URL.
fn detect_format(label: &str, url: &str) -> String {
    let lower = format!("{label} {url}").to_lowercase();

    if lower.contains("epub") {
        "epub".to_string()
    } else if lower.contains("pdf") {
        "pdf".to_string()
    } else {
        "other".to_string()
    }
}

/// Normaliza la etiqueta del enlace para mostrarla en el frontend.
fn normalize_label(label: &str, format: &str) -> String {
    let trimmed = label.trim();

    if trimmed.is_empty() {
        return match format {
            "epub" => "EPUB".to_string(),
            "pdf" => "PDF".to_string(),
            _ => "Descargar".to_string(),
        };
    }

    trimmed.to_string()
}

pub fn parse_books_page(html: &str) -> (Vec<DiscoverBookSummary>, bool) {
    let document = Html::parse_document(html);

    let card_sel = sel(".card");
    let title_sel = sel("a.title");
    let img_sel = sel("img");
    let author_sel = sel("div.subdetail a");

    let items: Vec<DiscoverBookSummary> = document
        .select(&card_sel)
        .filter_map(|card| {
            let title_el = card.select(&title_sel).next()?;
            let title = text_of(&title_el);
            let href = title_el.value().attr("href")?;
            let url = to_absolute_url(href);

            let cover_url = card
                .select(&img_sel)
                .next()
                .and_then(|img| img.value().attr("src"))
                .map(to_absolute_url);

            let author = card
                .select(&author_sel)
                .next()
                .map(|a| text_of(&a))
                .filter(|s| !s.is_empty());

            if title.is_empty() {
                return None;
            }

            Some(DiscoverBookSummary {
                id: slug_from_url(href),
                title,
                author,
                cover_url,
                url,
            })
        })
        .collect();

    let has_more = detect_has_more(&document, items.is_empty());

    (items, has_more)
}

fn detect_has_more(document: &Html, items_empty: bool) -> bool {
    let next_candidates = [
        "a.next.page-numbers",
        "a.next",
        ".pagination a.next",
        ".nav-links a.next",
    ];

    for css in next_candidates {
        if let Ok(s) = Selector::parse(css) {
            if document.select(&s).next().is_some() {
                return true;
            }
        }
    }

    !items_empty
}

pub fn parse_categories(html: &str) -> Vec<DiscoverCategory> {
    let document = Html::parse_document(html);

    let section_sel = sel("#secgenero");
    let term_sel = sel("a.term");

    let Some(section) = document.select(&section_sel).next() else {
        return Vec::new();
    };

    section
        .select(&term_sel)
        .filter_map(|a| {
            let name = text_of(&a);
            let path = a.value().attr("href")?.to_string();

            if name.is_empty() || path.is_empty() {
                return None;
            }

            Some(DiscoverCategory { name, path })
        })
        .collect()
}

pub fn parse_book_detail(html: &str) -> Result<DiscoverBookDetail, String> {
    let document = Html::parse_document(html);

    let title = document
        .select(&sel("#title h1"))
        .next()
        .map(|el| text_of(&el))
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "No se encontró el título del libro.".to_string())?;

    let cover_url = document
        .select(&sel("#cover img"))
        .next()
        .and_then(|img| img.value().attr("src"))
        .map(to_absolute_url);

    let author = document
        .select(&sel("#autor a"))
        .next()
        .map(|a| text_of(&a))
        .filter(|s| !s.is_empty());

    let synopsis = ["#sinopsis span", "#description span", "#sinopsis p", "p.description"]
        .iter()
        .find_map(|css| {
            document
                .select(&sel(css))
                .next()
                .map(|el| text_of(&el))
                .filter(|s| !s.is_empty())
        });

    // --- Extraer TODOS los enlaces de descarga de #downloadContainer ---
    // HTML real:
    //   <a href="/download.php?...">
    //     <input type="button" value="epub">
    //     <input type="button" value="epub">
    //   </a>
    let link_sel = sel("#downloadContainer a");
    let input_sel = sel("input[value]");

    let mut download_links: Vec<DownloadLink> = Vec::new();
    let mut seen_formats = std::collections::HashSet::new();

    for link in document.select(&link_sel) {
        let Some(href) = link.value().attr("href") else {
            continue;
        };

        // El label real está en el <input value="..."> dentro del <a>.
        let raw_label = link
            .select(&input_sel)
            .find_map(|inp| inp.value().attr("value").map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty());

        let Some(label_text) = raw_label else {
            continue;
        };

        let format = detect_format(&label_text, href);
        let url = to_absolute_url(href);

        // Evitar duplicados (lectulandia a veces pone el input dos veces).
        if seen_formats.contains(&format) {
            continue;
        }
        seen_formats.insert(format.clone());

        download_links.push(DownloadLink {
            label: label_text.to_uppercase(),
            format,
            url,
        });
    }

    if download_links.is_empty() {
        return Err("No se encontraron enlaces de descarga para este libro.".to_string());
    }

    Ok(DiscoverBookDetail {
        title,
        author,
        cover_url,
        synopsis,
        download_links,
    })
}
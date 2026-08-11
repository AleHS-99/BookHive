use scraper::{Html, Selector};

use crate::models::{DiscoverBookDetail, DiscoverBookSummary, DiscoverCategory};
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

/// Parsea una página que contiene tarjetas `.card` (home, búsqueda, categoría).
/// Devuelve los libros y si hay página siguiente.
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

/// Detecta si hay página siguiente buscando un link "next".
/// Si no lo encuentra, asume que hay más solo si la página actual tuvo resultados.
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

/// Parsea la lista de géneros/categorías del home (#secgenero).
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

/// Parsea la página de detalle de un libro.
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

    // Sinopsis con varios fallbacks (como hacía tu Python).
    let synopsis = ["#sinopsis span", "#description span", "#sinopsis p", "p.description"]
        .iter()
        .find_map(|css| {
            document
                .select(&sel(css))
                .next()
                .map(|el| text_of(&el))
                .filter(|s| !s.is_empty())
        });

    let download_href = document
        .select(&sel("#downloadContainer a"))
        .next()
        .and_then(|a| a.value().attr("href"))
        .ok_or_else(|| "No se encontró el enlace de descarga.".to_string())?;

    let download_page_url = to_absolute_url(download_href);

    Ok(DiscoverBookDetail {
        title,
        author,
        cover_url,
        synopsis,
        download_page_url,
    })
}
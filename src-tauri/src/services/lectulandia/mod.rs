pub mod client;
pub mod download;
pub mod parsers;

use crate::models::{
    DiscoverBookDetail, DiscoverBookSummary, DiscoverCategory, DiscoverHome, DiscoverPage,
};
use client::{build_client, get_html, to_absolute_url, BASE_URL};

/// Home: novedades + más leídos de la semana (en paralelo).
pub async fn fetch_home() -> Result<DiscoverHome, String> {
    let client = build_client()?;

    let novelties_fut = async {
        let html = get_html(&client, &format!("{BASE_URL}/book/")).await?;
        Ok::<Vec<DiscoverBookSummary>, String>(parsers::parse_books_page(&html).0)
    };

    let most_read_fut = async {
        let html = get_html(&client, &format!("{BASE_URL}/compartidos-semana/")).await?;
        Ok::<Vec<DiscoverBookSummary>, String>(parsers::parse_books_page(&html).0)
    };

    let (novelties, most_read) = tokio::try_join!(novelties_fut, most_read_fut)?;

    Ok(DiscoverHome {
        novelties,
        most_read,
    })
}

/// Lista de categorías/géneros.
pub async fn get_categories() -> Result<Vec<DiscoverCategory>, String> {
    let client = build_client()?;
    let html = get_html(&client, BASE_URL).await?;
    Ok(parsers::parse_categories(&html))
}

/// Búsqueda paginada.
pub async fn search_books(query: &str, page: u32) -> Result<DiscoverPage<DiscoverBookSummary>, String> {
    let client = build_client()?;

    let encoded: String = urlencoding::encode(query.trim()).replace("%20", "+");

    let url = if page <= 1 {
        format!("{BASE_URL}/search/{encoded}")
    } else {
        format!("{BASE_URL}/search/{encoded}/page/{page}/")
    };

    let html = get_html(&client, &url).await?;
    let (items, has_more) = parsers::parse_books_page(&html);

    Ok(DiscoverPage { items, page, has_more })
}

/// Libros de una categoría paginados.
pub async fn get_category_books(
    path: &str,
    page: u32,
) -> Result<DiscoverPage<DiscoverBookSummary>, String> {
    let client = build_client()?;

    let clean = path.trim();
    let clean_no_slash = clean.trim_end_matches('/');

    let url = if page <= 1 {
        format!("{BASE_URL}{clean}")
    } else {
        format!("{BASE_URL}{clean_no_slash}/page/{page}/")
    };

    let html = get_html(&client, &url).await?;
    let (items, has_more) = parsers::parse_books_page(&html);

    Ok(DiscoverPage { items, page, has_more })
}

/// Detalle de un libro (portada, autor, sinopsis, link de descarga).
pub async fn get_book_detail(url: &str) -> Result<DiscoverBookDetail, String> {
    let client = build_client()?;
    let abs = to_absolute_url(url);
    let html = get_html(&client, &abs).await?;
    parsers::parse_book_detail(&html)
}
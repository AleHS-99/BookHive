use crate::models::BookMetadata;
use epub::doc::{EpubDoc, MetadataItem};
use std::path::Path;

/// Busca el primer metadato que coincida con la propiedad de Dublin Core
fn get_meta_value(metadata: &[MetadataItem], property: &str) -> Option<String> {
    metadata
        .iter()
        .find(|item| item.property == property)
        .map(|item| item.value.clone())
        .filter(|s| !s.trim().is_empty())
}

pub fn extract_epub_metadata(book_path: &Path) -> Result<BookMetadata, String> {
    let book_path_str = book_path
        .to_str()
        .ok_or_else(|| "Ruta EPUB no válida.".to_string())?;

    let doc = EpubDoc::new(book_path_str)
        .map_err(|e| format!("Error abriendo EPUB para metadatos: {e:?}"))?;

    // El crate ya tiene un método específico para el título
    let title = doc.get_title().filter(|s| !s.trim().is_empty());

    // Para el resto, usamos los términos estándar de Dublin Core (EPUB OPF)
    let author = get_meta_value(&doc.metadata, "creator");
    let language = get_meta_value(&doc.metadata, "language");
    let description = get_meta_value(&doc.metadata, "description");
    let publisher = get_meta_value(&doc.metadata, "publisher");
    let published_date = get_meta_value(&doc.metadata, "date");

    Ok(BookMetadata {
        title,
        author,
        language,
        description,
        publisher,
        published_date,
    })
}

use reqwest::Client;
use std::time::Duration;

pub const BASE_URL: &str = "https://ww3.lectulandia.com";

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
    AppleWebKit/537.36 (KHTML, like Gecko) \
    Chrome/124.0.0.0 Safari/537.36";

pub fn build_client() -> Result<Client, String> {
    Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(30))
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))
}

pub async fn get_html(client: &Client, url: &str) -> Result<String, String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Error de red al pedir {url}: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("El servidor respondió con estado {status} para {url}"));
    }

    resp.text()
        .await
        .map_err(|e| format!("Error leyendo respuesta de {url}: {e}"))
}

pub fn to_absolute_url(href: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        href.to_string()
    } else {
        format!("{}{}", BASE_URL, href)
    }
}
use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct KickChannelPayload {
    slug: String,
    username: Option<String>,
    avatar_url: Option<String>,
    is_live: bool,
    title: Option<String>,
    category: Option<String>,
    viewers: Option<u64>,
}

#[tauri::command]
async fn fetch_kick_channel(slug: String) -> Result<KickChannelPayload, String> {
    let slug = normalize_slug(&slug)?;
    let url = format!("https://kick.com/api/v2/channels/{slug}");
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(USER_AGENT, "Kickerino/0.1")
        .header(ACCEPT, "application/json")
        .send()
        .await
        .map_err(|error| format!("Falha ao consultar Kick: {error}"))?;

    if response.status().as_u16() == 404 {
        return Err(format!("Canal '{slug}' nao encontrado"));
    }

    if !response.status().is_success() {
        return Err(format!(
            "Kick respondeu com status {} para '{slug}'",
            response.status()
        ));
    }

    let json: Value = response
        .json()
        .await
        .map_err(|error| format!("Resposta invalida da Kick: {error}"))?;

    Ok(map_kick_channel(slug, &json))
}

fn normalize_slug(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_start_matches('@');
    let without_domain = trimmed
        .strip_prefix("https://kick.com/")
        .or_else(|| trimmed.strip_prefix("https://www.kick.com/"))
        .or_else(|| trimmed.strip_prefix("http://kick.com/"))
        .or_else(|| trimmed.strip_prefix("http://www.kick.com/"))
        .unwrap_or(trimmed);
    let slug = without_domain
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .trim()
        .to_lowercase();

    if slug.is_empty() {
        return Err("Informe um canal da Kick".into());
    }

    if !slug
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '_' || character == '-')
    {
        return Err("Use apenas o slug do canal, como 0baratta ou leokaos".into());
    }

    Ok(slug)
}

fn map_kick_channel(slug: String, json: &Value) -> KickChannelPayload {
    let livestream = json.get("livestream").filter(|value| !value.is_null());
    let user = json.get("user");
    let category = livestream
        .and_then(|stream| stream.get("category"))
        .and_then(|category| first_string(category, &["name", "slug"]));

    KickChannelPayload {
        slug: first_string(json, &["slug"]).unwrap_or(slug),
        username: user
            .and_then(|user| first_string(user, &["username", "name"]))
            .or_else(|| first_string(json, &["user_username", "username"])),
        avatar_url: user
            .and_then(|user| first_string(user, &["profile_pic", "profilepic", "avatar"]))
            .or_else(|| first_string(json, &["profile_pic", "profilepic", "avatar"])),
        is_live: livestream.is_some(),
        title: livestream.and_then(|stream| first_string(stream, &["session_title", "title"])),
        category,
        viewers: livestream.and_then(|stream| first_u64(stream, &["viewer_count", "viewers"])),
    }
}

fn first_string(json: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| json.get(*key))
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .next()
}

fn first_u64(json: &Value, keys: &[&str]) -> Option<u64> {
    keys.iter()
        .filter_map(|key| json.get(*key))
        .filter_map(Value::as_u64)
        .next()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![fetch_kick_channel])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kickerino");
}

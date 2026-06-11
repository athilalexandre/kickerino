use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

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
    chatroom_id: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LatestReleasePayload {
    current_version: String,
    latest_version: String,
    tag_name: String,
    name: Option<String>,
    html_url: String,
    installer_url: Option<String>,
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

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn fetch_latest_release() -> Result<LatestReleasePayload, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/athilalexandre/kickerino/releases/latest")
        .header(USER_AGENT, "Kickerino/0.1")
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Falha ao consultar GitHub: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub respondeu com status {} ao buscar atualizacoes",
            response.status()
        ));
    }

    let json: Value = response
        .json()
        .await
        .map_err(|error| format!("Resposta invalida do GitHub: {error}"))?;
    let tag_name =
        first_string(&json, &["tag_name"]).ok_or("Release sem tag_name no GitHub")?;
    let html_url =
        first_string(&json, &["html_url"]).ok_or("Release sem html_url no GitHub")?;
    let latest_version = tag_name.trim_start_matches('v').to_string();
    let installer_url = latest_installer_url(&json);

    Ok(LatestReleasePayload {
        current_version: app_version(),
        latest_version,
        tag_name,
        name: first_string(&json, &["name"]),
        html_url,
        installer_url,
    })
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
        chatroom_id: json.get("chatroom").and_then(|c| first_u64(c, &["id"])),
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

fn latest_installer_url(json: &Value) -> Option<String> {
    let assets = json.get("assets")?.as_array()?;
    ["setup.exe", ".exe", ".msi"].iter().find_map(|suffix| {
        assets.iter().find_map(|asset| {
            let name = first_string(asset, &["name"])?.to_lowercase();
            let url = first_string(asset, &["browser_download_url"])?;

            if name.ends_with(suffix) {
                Some(url)
            } else {
                None
            }
        })
    })
}

#[tauri::command]
async fn open_support_window(
    app: AppHandle,
    slug: String,
    js_script: String,
) -> Result<(), String> {
    let label = "support-worker";

    // If window already exists, close it first to recreate with new script
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.close();
    }

    let url_str = format!("https://kick.com/popout/{}/chat", slug);
    let parsed_url = url_str.parse::<tauri::Url>().map_err(|e| e.to_string())?;

    let builder = WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::External(parsed_url)
    )
    .title(format!("Kickerino Apoio - {}", slug))
    .inner_size(300.0, 300.0) // Small size for background execution
    .position(-2000.0, -2000.0) // Position off-screen (negative coords are not clamped by Windows)
    .visible(true)
    .decorations(false) // Borderless/No title bar
    .skip_taskbar(true) // Hide from taskbar
    .initialization_script(&js_script);

    let window = builder.build().map_err(|e| e.to_string())?;

    // Listen to window destroyed event to notify frontend
    let app_handle = app.clone();
    let label_clone = label.to_string();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let _ = app_handle.emit("support-window-closed", label_clone.clone());
        }
    });

    Ok(())
}

#[tauri::command]
async fn close_support_window(app: AppHandle, _slug: Option<String>) -> Result<(), String> {
    let label = "support-worker";
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.close();
    }
    Ok(())
}

#[tauri::command]
async fn close_all_support_windows(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("support-worker") {
        let _ = w.close();
    }
    for window in app.webview_windows().values() {
        let label = window.label();
        if label.starts_with("support-") {
            let _ = window.close();
        }
    }
    Ok(())
}

#[tauri::command]
async fn send_support_message(app: AppHandle, _slug: Option<String>) -> Result<(), String> {
    let label = "support-worker";
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.eval("if (window.__KICKERINO_SEND_MESSAGE__) window.__KICKERINO_SEND_MESSAGE__();");
    }
    Ok(())
}

#[tauri::command]
async fn open_login_window(app: AppHandle) -> Result<(), String> {
    let label = "kick-login";

    // Close existing if open
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.close();
    }

    let url_str = "https://kick.com/";
    let parsed_url = url_str.parse::<tauri::Url>().map_err(|e| e.to_string())?;

    // Injected JS script to detect login status and update URL hash
    let js_script = r##"
        (function() {
            console.log('[Kickerino] Monitor de login iniciado.');
            setInterval(() => {
                const loggedIn = !!(
                    document.querySelector('a[href*="/dashboard"]') ||
                    document.querySelector('a[href*="/studio"]') ||
                    document.querySelector('a[href*="/creator"]') ||
                    document.querySelector('a[href*="/settings"]') ||
                    document.querySelector('a[href*="/following"]') ||
                    document.querySelector('a[href*="/seguindo"]') ||
                    document.querySelector('[aria-label*="profile" i]') ||
                    document.querySelector('[aria-label*="account" i]') ||
                    document.querySelector('[aria-label*="perfil" i]') ||
                    document.querySelector('[aria-label*="usuário" i]') ||
                    document.querySelector('[aria-label*="usuario" i]') ||
                    document.querySelector('[id^="headlessui-menu-button"]') ||
                    document.querySelector('.user-menu') ||
                    Array.from(document.querySelectorAll('img')).find(img => {
                        const alt = (img.getAttribute('alt') || '').toLowerCase();
                        const src = (img.getAttribute('src') || '').toLowerCase();
                        return (src.includes('profile_image') || src.includes('profile_pictures') || src.includes('avatar') || (alt.length > 0 && !alt.includes('kick') && !src.includes('logo') && !alt.includes('banner') && !alt.includes('preview') && !src.includes('cover') && !src.includes('thumbnail')));
                    })
                );
                
                if (loggedIn) {
                    if (window.location.hash !== "#connected") {
                        window.location.hash = "connected";
                    }
                } else {
                    const loginBtn = document.querySelector('a[href*="/login"]') ||
                                     document.querySelector('button[data-to*="login" i]') ||
                                     document.querySelector('a[href*="/signup"]') ||
                                     Array.from(document.querySelectorAll('button, a')).find(el => {
                                         const txt = (el.innerText || el.textContent || '').toLowerCase();
                                         return txt.includes('log in') || txt.includes('entrar') || txt.includes('login') || txt.includes('cadastrar') || txt.includes('sign up');
                                     });
                    if (loginBtn) {
                        if (window.location.hash !== "#disconnected") {
                            window.location.hash = "disconnected";
                        }
                    }
                }
            }, 500);
        })();
    "##;

    let mut builder = WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::External(parsed_url)
    )
    .title("Kick Login - Kickerino")
    .inner_size(500.0, 650.0)
    .visible(false) // Start invisible
    .initialization_script(js_script);

    if let Some(main) = app.get_webview_window("main") {
        builder = builder.parent(&main).map_err(|e| e.to_string())?;
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    // Spawn async background thread to poll the window's title
    let window_clone = window.clone();
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut connected = false;

        // Wait up to 20 seconds (40 iterations)
        for _ in 0..40 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            // Exit if window was closed
            if app_handle.get_webview_window(window_clone.label()).is_none() {
                break;
            }

            if let Ok(url) = window_clone.url() {
                let fragment = url.fragment().unwrap_or("");
                if fragment == "connected" {
                    connected = true;
                    break;
                } else if fragment == "disconnected" {
                    break;
                }
            }
        }

        if connected {
            let _ = app_handle.emit("kick-login-event", "connected");
            let _ = window_clone.close();
        } else {
            // Either timed out or explicitly disconnected. Show the login window
            let _ = app_handle.emit("kick-login-event", "disconnected");
            let _ = window_clone.show();
            let _ = window_clone.set_focus();

            // Continue polling for login transition
            let window_clone2 = window_clone.clone();
            let app_handle2 = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    if app_handle2.get_webview_window(window_clone2.label()).is_none() {
                        break;
                    }
                    if let Ok(url) = window_clone2.url() {
                        let fragment = url.fragment().unwrap_or("");
                        if fragment == "connected" {
                            let _ = app_handle2.emit("kick-login-event", "connected");
                            let _ = window_clone2.close();
                            break;
                        }
                    }
                }
            });
        }
    });

    Ok(())
}

#[tauri::command]
fn log_message(app: AppHandle, level: String, message: String, timestamp: String) {
    println!("[Support Worker - {}] [{}] {}", timestamp, level.to_uppercase(), message);
    let _ = app.emit("support-log", serde_json::json!({
        "level": level,
        "message": message,
        "timestamp": timestamp
    }));
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            app_version,
            fetch_kick_channel,
            fetch_latest_release,
            open_support_window,
            close_support_window,
            close_all_support_windows,
            open_login_window,
            send_support_message,
            log_message
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kickerino");
}


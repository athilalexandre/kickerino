use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use std::fs::File;
use std::io::BufReader;
use rodio::{Decoder, DeviceSinkBuilder, Player, Source};

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
async fn select_sound_file() -> Result<Option<(String, String)>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Som", &["mp3", "wav", "ogg", "flac", "m4a", "aac"])
        .pick_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_string_lossy().to_string();
        let name = file_handle.file_name();
        Ok(Some((path, name)))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn play_sound_rust(path: Option<String>, volume_percent: f32) -> Result<(), String> {
    let volume = volume_percent / 100.0;
    std::thread::spawn(move || {
        if let Ok(mixer_device_sink) = DeviceSinkBuilder::open_default_sink() {
            let player = Player::connect_new(&mixer_device_sink.mixer());
            player.set_volume(volume);
            
            // Play custom file if provided
            if let Some(ref path_str) = path {
                if !path_str.is_empty() {
                    if let Ok(file) = File::open(path_str) {
                        let reader = BufReader::new(file);
                        if let Ok(source) = Decoder::new(reader) {
                            player.append(source);
                            player.sleep_until_end();
                            return;
                        }
                    }
                }
            }
            
            // Fallback to default synthesized beep
            let c5 = rodio::source::SineWave::new(523.25)
                .take_duration(std::time::Duration::from_millis(150));
            let e5 = rodio::source::SineWave::new(659.25)
                .take_duration(std::time::Duration::from_millis(150));
            let g5 = rodio::source::SineWave::new(783.99)
                .take_duration(std::time::Duration::from_millis(150));
            let c6 = rodio::source::SineWave::new(1046.50)
                .take_duration(std::time::Duration::from_millis(300));
            
            player.append(c5);
            std::thread::sleep(std::time::Duration::from_millis(100));
            player.append(e5);
            std::thread::sleep(std::time::Duration::from_millis(100));
            player.append(g5);
            std::thread::sleep(std::time::Duration::from_millis(100));
            player.append(c6);
            player.sleep_until_end();
        }
    });
    Ok(())
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

static LAST_OPEN: std::sync::Mutex<Option<(String, std::time::Instant)>> = std::sync::Mutex::new(None);

#[tauri::command]
async fn open_support_window(
    app: AppHandle,
    slug: String,
    js_script: String,
) -> Result<(), String> {
    // Evitar cliques duplos / chamadas duplicadas consecutivas no mesmo segundo
    {
        let mut last_open = LAST_OPEN.lock().unwrap();
        let now = std::time::Instant::now();
        if let Some((ref last_slug, last_time)) = *last_open {
            if last_slug == &slug && now.duration_since(last_time) < std::time::Duration::from_millis(1500) {
                println!("[Rust] Ignorando chamada duplicada para abrir suporte de '{}' dentro de 1.5s", slug);
                return Ok(());
            }
        }
        *last_open = Some((slug.clone(), now));
    }

    let label = "support-worker";

    // If window already exists, close it first to recreate with new script
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.close();
        // Aguarda a janela ser destruida antes de criar uma nova
        for _ in 0..20 {
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            if app.get_webview_window(label).is_none() {
                break;
            }
        }
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
    .visible(false)
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

    // Injected JS script to detect login status, extract username, and update URL hash
    let js_script = r##"
        (function() {
            console.log('[Kickerino] Monitor de login iniciado.');
            let disconnectedCount = 0;
            let connectedCount = 0;
            setInterval(() => {
                // Only use selectors that reliably indicate an authenticated session.
                // Avoid generic img heuristics — the Kick homepage shows streamer/category
                // images with non-empty alt text even for logged-out visitors, causing
                // false positives.
                const loggedIn = !!(
                    document.querySelector('a[href*="/dashboard"]') ||
                    document.querySelector('a[href*="/studio"]') ||
                    document.querySelector('a[href*="/creator"]') ||
                    document.querySelector('a[href*="/settings"]') ||
                    document.querySelector('a[href*="/following"]') ||
                    document.querySelector('a[href*="/seguindo"]') ||
                    document.querySelector('[id^="headlessui-menu-button"]') ||
                    document.querySelector('.user-menu') ||
                    // Only match avatar images inside user-menu / nav-bar header areas
                    document.querySelector('nav img[src*="profile_image"]') ||
                    document.querySelector('nav img[src*="profile_pictures"]') ||
                    document.querySelector('header img[src*="profile_image"]') ||
                    document.querySelector('header img[src*="profile_pictures"]') ||
                    document.querySelector('[class*="user"] img[src*="profile_image"]') ||
                    document.querySelector('[class*="user"] img[src*="profile_pictures"]')
                );
                
                if (loggedIn) {
                    disconnectedCount = 0;
                    connectedCount++;
                    // Require 4 consecutive cycles (2 seconds) to confirm connected
                    // This prevents false positives during page hydration
                    if (connectedCount >= 4) {
                        let username = "";
                        try {
                            const img = document.querySelector('nav img[src*="profile_image"]') || 
                                        document.querySelector('header img[src*="profile_image"]') ||
                                        document.querySelector('nav img[src*="profile_pictures"]') ||
                                        document.querySelector('header img[src*="profile_pictures"]');
                            if (img) {
                                const alt = img.getAttribute('alt') || '';
                                if (alt && !alt.toLowerCase().includes('logo') && !alt.toLowerCase().includes('kick')) {
                                    username = alt.replace(/avatar\s+de\s+/i, '').replace(/'s\s+avatar/i, '').trim();
                                }
                            }
                            if (!username) {
                                for (let i = 0; i < localStorage.length; i++) {
                                    const key = localStorage.key(i);
                                    if (key.includes('user') || key.includes('auth')) {
                                        const val = localStorage.getItem(key);
                                        if (val) {
                                            try {
                                                const obj = JSON.parse(val);
                                                if (obj && typeof obj === 'object') {
                                                    username = obj.username || obj.slug || (obj.user && (obj.user.username || obj.user.slug)) || "";
                                                    if (username) break;
                                                }
                                            } catch(e){}
                                        }
                                    }
                                }
                            }
                        } catch(e){}

                        const targetHash = username ? "connected:" + username : "connected";
                        if (window.location.hash !== "#" + targetHash) {
                            window.location.hash = targetHash;
                        }
                    }
                } else {
                    connectedCount = 0;
                    const loginBtn = document.querySelector('a[href*="/login"]') ||
                                     document.querySelector('button[data-to*="login" i]') ||
                                     document.querySelector('a[href*="/signup"]') ||
                                     Array.from(document.querySelectorAll('button, a')).find(el => {
                                         const txt = (el.innerText || el.textContent || '').toLowerCase();
                                         return txt.includes('log in') || txt.includes('entrar') || txt.includes('login') || txt.includes('cadastrar') || txt.includes('sign up');
                                     });
                    if (loginBtn) {
                        disconnectedCount++;
                        // Apenas confirma como disconnected se persistir por 6 ciclos (3 segundos)
                        // Isso previne falsos positivos de desconexão durante o carregamento inicial da página (hydration lag)
                        if (disconnectedCount >= 6) {
                            if (window.location.hash !== "#disconnected") {
                                window.location.hash = "disconnected";
                            }
                        }
                    } else {
                        disconnectedCount = 0;
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
        let mut payload = "connected".to_string();

        // Wait up to 20 seconds (40 iterations)
        for _ in 0..40 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            // Exit if window was closed
            if app_handle.get_webview_window(window_clone.label()).is_none() {
                break;
            }

            if let Ok(url) = window_clone.url() {
                let fragment = url.fragment().unwrap_or("");
                if fragment.starts_with("connected") {
                    connected = true;
                    payload = fragment.to_string();
                    break;
                } else if fragment == "disconnected" {
                    break;
                }
            }
        }

        if connected {
            let _ = app_handle.emit("kick-login-event", payload);
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
                        if fragment.starts_with("connected") {
                            let p = fragment.to_string();
                            let _ = app_handle2.emit("kick-login-event", p);
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
async fn logout_kick(app: AppHandle) -> Result<(), String> {
    let label = "kick-login";

    // Close existing if open
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.close();
    }

    let url_str = "https://kick.com/";
    let parsed_url = url_str.parse::<tauri::Url>().map_err(|e| e.to_string())?;

    // Script to logout
    let js_script = r##"
        (function() {
            console.log('[Kickerino] Iniciando fluxo de logout.');
            function doLogout() {
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch(e){}
                const profileBtn = document.querySelector('[id^="headlessui-menu-button"]') || document.querySelector('.user-menu');
                if (profileBtn) {
                    profileBtn.click();
                    setTimeout(() => {
                        const logoutBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
                            const txt = (el.innerText || el.textContent || '').toLowerCase();
                            return txt.includes('logout') || txt.includes('log out') || txt.includes('sair') || txt.includes('desconectar');
                        });
                        if (logoutBtn) {
                            logoutBtn.click();
                        } else {
                            window.location.hash = "disconnected";
                        }
                    }, 500);
                } else {
                    window.location.hash = "disconnected";
                }
            }
            if (document.readyState === 'complete') {
                doLogout();
            } else {
                window.addEventListener('load', doLogout);
            }
        })();
    "##;

    let mut builder = WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::External(parsed_url)
    )
    .title("Kick Logout - Kickerino")
    .inner_size(500.0, 650.0)
    .visible(false)
    .initialization_script(js_script);

    if let Some(main) = app.get_webview_window("main") {
        builder = builder.parent(&main).map_err(|e| e.to_string())?;
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    let window_clone = window.clone();
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        for _ in 0..30 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if app_handle.get_webview_window(window_clone.label()).is_none() {
                break;
            }
            if let Ok(url) = window_clone.url() {
                let fragment = url.fragment().unwrap_or("");
                if fragment == "disconnected" {
                    break;
                }
            }
        }
        let _ = app_handle.emit("kick-login-event", "disconnected");
        let _ = window_clone.close();
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

#[derive(Debug, serde::Deserialize)]
struct KickEmoteItem {
    id: Value,
    name: Option<String>,
    slug: Option<String>,
    code: Option<String>,
    keyword: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct KickEmoteGroup {
    emotes: Option<Vec<KickEmoteItem>>,
}

#[tauri::command]
async fn fetch_channels_emotes(slugs: Vec<String>) -> Result<std::collections::HashMap<String, String>, String> {
    let client = reqwest::Client::new();
    let emote_map = std::sync::Arc::new(std::sync::Mutex::new(std::collections::HashMap::new()));
    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    let mut handles = Vec::new();
    for slug in slugs {
        if let Ok(normalized) = normalize_slug(&slug) {
            let client_clone = client.clone();
            let emote_map_clone = emote_map.clone();
            handles.push(tokio::spawn(async move {
                let url = format!("https://kick.com/api/v2/emotes/{}", normalized);
                let response = client_clone.get(url)
                    .header(USER_AGENT, ua)
                    .header(ACCEPT, "application/json")
                    .send()
                    .await;
                
                if let Ok(res) = response {
                    if res.status().is_success() {
                        if let Ok(groups) = res.json::<Vec<KickEmoteGroup>>().await {
                            let mut map = emote_map_clone.lock().unwrap();
                            for group in groups {
                                if let Some(emotes) = group.emotes {
                                    for item in emotes {
                                        let id_str = match item.id {
                                            Value::Number(n) => n.to_string(),
                                            Value::String(s) => s,
                                            _ => continue,
                                        };
                                        let name_str = item.name
                                            .or(item.slug)
                                            .or(item.code)
                                            .or(item.keyword);
                                        if let Some(name) = name_str {
                                            if !name.is_empty() {
                                                map.insert(name.to_lowercase(), id_str);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }));
        }
    }

    for h in handles {
        let _ = h.await;
    }

    let map = std::sync::Arc::try_unwrap(emote_map).unwrap().into_inner().unwrap();
    Ok(map)
}

use std::fs;
use std::path::PathBuf;

fn get_key_filepath(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados do app: {}", e))?;
    
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Falha ao criar diretório de dados: {}", e))?;
    }
    
    path.push("missxss_key.txt");
    Ok(path)
}

fn get_effective_api_key(app: &AppHandle) -> Result<String, String> {
    // 1. Check environment variable first
    if let Ok(key) = std::env::var("MISSXSS_API_KEY") {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    
    // 2. Check stored key file
    if let Ok(path) = get_key_filepath(app) {
        if path.exists() {
            if let Ok(key) = fs::read_to_string(path) {
                let trimmed = key.trim();
                if !trimmed.is_empty() {
                    return Ok(trimmed.to_string());
                }
            }
        }
    }
    
    Err("API Key da MissXss não encontrada. Por favor, configure-a no painel de configurações.".to_string())
}

#[tauri::command]
fn has_missxss_api_key(app: AppHandle) -> bool {
    get_effective_api_key(&app).is_ok()
}

#[tauri::command]
fn save_missxss_api_key(app: AppHandle, api_key: String) -> Result<(), String> {
    let path = get_key_filepath(&app)?;
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return Err("A chave API não pode ser vazia.".to_string());
    }
    fs::write(path, trimmed)
        .map_err(|e| format!("Falha ao salvar a chave no disco: {}", e))?;
    Ok(())
}

#[tauri::command]
fn delete_missxss_api_key(app: AppHandle) -> Result<(), String> {
    let path = get_key_filepath(&app)?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|e| format!("Falha ao deletar a chave no disco: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn fetch_missxss_watch_time(app: AppHandle, platform: String, username: String) -> Result<serde_json::Value, String> {
    let api_key = get_effective_api_key(&app)?;

    let client = reqwest::Client::new();
    let mut body = serde_json::Map::new();
    body.insert("platform".to_string(), serde_json::Value::String(platform));
    body.insert("username".to_string(), serde_json::Value::String(username));

    let response = client
        .post("https://api.missxss.com.tr/v1/get-watch-time")
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {api_key}"))
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|err| format!("Erro de rede ao conectar com MissXss API: {}", err))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("API Key da MissXss inválida ou não autorizada.".to_string());
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("Resposta inválida da MissXss API: {}", err))?;

    Ok(json)
}

#[tauri::command]
async fn fetch_missxss_top_watch_time(
    app: AppHandle,
    limit: Option<u32>,
    platform: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    day: Option<String>,
) -> Result<serde_json::Value, String> {
    let api_key = get_effective_api_key(&app)?;

    let client = reqwest::Client::new();
    let mut body = serde_json::Map::new();
    
    if let Some(l) = limit {
        body.insert("limit".to_string(), serde_json::Value::Number(l.into()));
    }
    if let Some(p) = platform {
        body.insert("platform".to_string(), serde_json::Value::String(p));
    }
    if let Some(df) = date_from {
        body.insert("date_from".to_string(), serde_json::Value::String(df));
    }
    if let Some(dt) = date_to {
        body.insert("date_to".to_string(), serde_json::Value::String(dt));
    }
    if let Some(d) = day {
        body.insert("day".to_string(), serde_json::Value::String(d));
    }

    let response = client
        .post("https://api.missxss.com.tr/v1/get-watch-time-top")
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {api_key}"))
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|err| format!("Erro de rede ao conectar com MissXss API: {}", err))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("API Key da MissXss inválida ou não autorizada.".to_string());
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("Resposta inválida da MissXss API: {}", err))?;

    Ok(json)
}

#[tauri::command]
async fn install_update(app: AppHandle, url: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header(USER_AGENT, "Kickerino/0.1")
        .send()
        .await
        .map_err(|error| format!("Falha ao iniciar download da atualização: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Falha ao baixar atualização: servidor retornou status {}",
            response.status()
        ));
    }

    let total_size = response.content_length();
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?;
    
    let temp_path = app_dir.join("kickerino_setup.exe");
    
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|error| format!("Falha ao criar arquivo temporário: {error}"))?;

    let mut downloaded: u64 = 0;
    let mut last_emitted_percentage: u32 = 0;

    let mut response = response;
    while let Some(chunk) = response.chunk().await.map_err(|e| format!("Erro no download: {e}"))? {
        downloaded += chunk.len() as u64;
        use std::io::Write;
        file.write_all(&chunk)
            .map_err(|error| format!("Falha ao escrever no disco: {error}"))?;

        if let Some(total) = total_size {
            let percentage = (downloaded as f64 / total as f64 * 100.0) as u32;
            if percentage > last_emitted_percentage {
                last_emitted_percentage = percentage;
                let _ = app.emit("update-download-progress", percentage);
            }
        }
    }

    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);

    let installer_path = temp_path.to_string_lossy().to_string();
    std::process::Command::new("cmd")
        .args(&["/C", "start", "", &installer_path])
        .spawn()
        .map_err(|error| format!("Falha ao iniciar o instalador: {error}"))?;

    app.exit(0);

    Ok(())
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
            logout_kick,
            send_support_message,
            log_message,
            fetch_channels_emotes,
            fetch_missxss_watch_time,
            fetch_missxss_top_watch_time,
            has_missxss_api_key,
            save_missxss_api_key,
            delete_missxss_api_key,
            install_update,
            select_sound_file,
            play_sound_rust
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kickerino");
}

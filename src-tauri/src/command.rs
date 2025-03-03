use pdf_parser::uploader::FileManager;
use pdf_parser::types::LLMConfig;
use serde_json::json;
use std::path::Path;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::blake2::DRAG_TO_BLAKE2;
use crate::server_manager::ServerManager;
use share::hotkey_manager::HotkeyManager;
use share::logger::{LogMessage, Logger};
use share::task_proxy::LOGIN_STATUS;
use share::types::{BaseConfig, HotkeyConfig, ServerConfig};

// 获取登录状态
#[tauri::command]
pub async fn get_login_status() -> bool {
    let login_status = LOGIN_STATUS.load(Ordering::Relaxed);
    login_status
}

// 保存配置
#[tauri::command]
pub async fn save_server_config(app: tauri::AppHandle, config: ServerConfig) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("server", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// 获取配置
#[tauri::command]
pub fn get_server_config(app: tauri::AppHandle) -> ServerConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("server") {
        Some(data) => match serde_json::from_value(data) {
            Ok(config) => config,
            Err(_) => ServerConfig::default(),
        },
        None => ServerConfig::default(),
    }
}

// 保存配置, 并重启服务器
#[tauri::command]
pub async fn reload_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, ServerManager>,
    config: ServerConfig,
) -> Result<(), String> {
    let _ = save_server_config(app, config.clone()).await;
    state.reload(config).await;
    Ok(())
}

// 重启服务器
#[tauri::command]
pub async fn restart_server(state: tauri::State<'_, ServerManager>) -> Result<(), String> {
    state.restart().await;
    Ok(())
}

// 停止服务器
#[tauri::command]
pub fn stop_server(state: tauri::State<'_, ServerManager>) -> Result<(), String> {
    state.stop();
    Ok(())
}

pub fn set_auto_start(app: tauri::AppHandle, auto_start: bool) -> Result<(), String> {
    let autostart_manager = app.autolaunch();
    if auto_start {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }
    Ok(())
}

#[tauri::command]
pub fn get_base_config(app: tauri::AppHandle) -> BaseConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("base") {
        Some(data) => match serde_json::from_value(data) {
            Ok(config) => config,
            Err(_) => BaseConfig::default(),
        },
        None => BaseConfig::default(),
    }
}

#[tauri::command]
pub fn save_base_config(app: tauri::AppHandle, config: BaseConfig) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("base", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    let _ = set_auto_start(app, config.auto_start);
    Ok(())
}

#[tauri::command]
pub fn get_server_logs(logger: tauri::State<'_, Arc<Mutex<Logger>>>) -> Vec<LogMessage> {
    let logger = logger.lock().unwrap();
    logger.try_get_logs()
}

#[tauri::command]
pub fn write_log(logger: tauri::State<'_, Arc<Mutex<Logger>>>, level: &str, message: &str) {
    if let Ok(logger) = logger.lock() {
        logger.log(level, message);
    }
}

// 快捷键设置
#[tauri::command]
pub fn get_hotkey_config(app: tauri::AppHandle) -> HotkeyConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("hotkey") {
        Some(data) => match serde_json::from_value(data) {
            Ok(config) => config,
            Err(_) => HotkeyConfig::default(),
        },
        None => HotkeyConfig::default(),
    }
}

// 大模型配置
#[tauri::command]
pub fn get_llm_config(app: tauri::AppHandle) -> LLMConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("llm") {
        Some(data) => match serde_json::from_value(data) {
            Ok(config) => config,
            Err(_) => LLMConfig::default(),
        },
        None => LLMConfig::default(),
    }
}

#[tauri::command]
pub fn save_hotkey_config(app: tauri::AppHandle, config: HotkeyConfig) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("hotkey", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn stop_hotkey_listener(state: tauri::State<'_, HotkeyManager>) -> Result<(), String> {
    state.stop();
    Ok(())
}

#[tauri::command]
pub fn start_hotkey_listener(state: tauri::State<'_, HotkeyManager>) -> Result<(), String> {
    state.start();
    Ok(())
}

#[tauri::command]
pub fn restart_hotkey_listener(state: tauri::State<'_, HotkeyManager>) -> Result<(), String> {
    state.stop();
    state.start();
    Ok(())
}

#[tauri::command]
pub async fn reload_hotkey_listener(
    state: tauri::State<'_, HotkeyManager>,
    config: HotkeyConfig,
) -> Result<(), String> {
    state.stop();
    state.save_config(config);
    state.start();
    Ok(())
}

#[tauri::command]
pub fn is_listening(state: tauri::State<'_, HotkeyManager>) -> bool {
    state.is_listening()
}

#[tauri::command]
pub fn open_local_dir(target: &str) {
    println!("open_local_dir: {}", target);
    let path = Path::new(target);
    if path.exists() {
        if path.is_dir() {
            if cfg!(target_os = "windows") {
                let _ = std::process::Command::new("explorer").arg(path).spawn();
            } else if cfg!(target_os = "macos") {
                let _ = std::process::Command::new("open").arg(path).spawn();
            } else if cfg!(target_os = "linux") {
                let _ = std::process::Command::new("xdg-open").arg(path).spawn();
            }
        } else {
            let _ = std::process::Command::new("explorer")
                .arg(path.parent().unwrap())
                .spawn();
        }
    }
}

#[tauri::command]
pub fn open_with_wps(target: &str, name: &str) {
    let file_path = Path::new(target).join(Path::new(name));
    let _ = std::process::Command::new("wps").arg(file_path).spawn();
}

#[tauri::command]
pub fn minimize_window(app: tauri::AppHandle) {
    let window = app.get_webview_window("main").unwrap();
    window.minimize().unwrap();
}

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) {
    let window = app.get_webview_window("main").unwrap();
    window.hide().unwrap();
}

#[tauri::command]
pub fn switch_drag_to_blake2(value: bool) {
    DRAG_TO_BLAKE2.store(value, Ordering::Relaxed);
}

#[tauri::command]
pub fn reload_llm_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, FileManager>,
    config: LLMConfig,
) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("llm", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    // state.reload(config);
    Ok(())
}

#[tauri::command]
pub fn save_llm_config(
    app: tauri::AppHandle,
    config: LLMConfig,
) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("llm", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
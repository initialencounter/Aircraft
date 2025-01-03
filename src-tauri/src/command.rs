use serde_json::json;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::config::{BaseConfig, HotkeyConfig, ServerConfig};
use crate::listen_manager::ListenManager;
use crate::logger::{LogMessage, Logger};
use crate::server_manager::ServerManager;

#[tauri::command]
pub async fn get_login_status() -> bool {
    use crate::ziafp::LOGIN_STATUS;
    use std::sync::atomic::Ordering;
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
    let mut logger = logger.lock().unwrap();
    logger.try_get_logs()
}


#[tauri::command]
pub fn write_log(logger: tauri::State<'_, Arc<Mutex<Logger>>>, level: &str, message: &str) {
    if let Ok(mut logger) = logger.lock() {
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

#[tauri::command]
pub fn save_hotkey_config(app: tauri::AppHandle, config: HotkeyConfig) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("hotkey", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn stop_hotkey_listener(state: tauri::State<'_, ListenManager>) -> Result<(), String> {
    state.stop();
    Ok(())
}

#[tauri::command]
pub fn start_hotkey_listener(state: tauri::State<'_, ListenManager>) -> Result<(), String> {
    state.start();
    Ok(())
}

#[tauri::command]
pub fn restart_hotkey_listener(state: tauri::State<'_, ListenManager>) -> Result<(), String> {
    state.stop();
    state.start();
    Ok(())
}

#[tauri::command]
pub async fn reload_hotkey_listener(
    state: tauri::State<'_, ListenManager>,
    config: HotkeyConfig,
) -> Result<(), String> {
    state.stop();
    state.save_config(config);
    state.start();
    Ok(())
}

#[tauri::command]
pub fn is_listening(state: tauri::State<'_, ListenManager>) -> bool {
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
    let _ = std::process::Command::new("wps")
        .arg(file_path)
        .spawn();
}
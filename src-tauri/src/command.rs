use serde_json::json;
use std::path::Path;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::config::{BaseConfig, ServerConfig};
use crate::logger::LogMessage;
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
    println!("reload_config: {:?}", config);
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
pub fn get_server_logs(state: tauri::State<'_, ServerManager>) -> Vec<LogMessage> {
    state.try_get_logs()
}

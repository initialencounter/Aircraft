use base64::prelude::*;
use serde_json::json;
use share::pdf_parser::read::read_pdf_u8;
use share::pdf_parser::uploader::FileManager;
use share::types::{Config, LLMConfig};
use std::path::Path;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex as AsyncMutex;

use share::logger::{LogMessage, Logger};
use share::manager::hotkey_manager::HotkeyManager;
use share::manager::server_manager::ServerManager;
use share::summary_rs::{get_summary_info_by_buffer as get_summary_info_by_u8, SummaryInfo};
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
        Some(data) => serde_json::from_value(data).unwrap_or_else(|_| ServerConfig::default()),
        None => ServerConfig::default(),
    }
}

// 保存配置, 并重启服务器
#[tauri::command]
pub async fn reload_server_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, ServerManager>,
    config: ServerConfig,
) -> Result<(), String> {
    let _ = save_server_config(app.clone(), config.clone()).await;
    let llm_config: LLMConfig = {
        let store = app.store(&Path::new("config.json")).unwrap();
        match store.get("llm") {
            Some(data) => serde_json::from_value(data).unwrap_or_else(|_| LLMConfig::default()),
            None => LLMConfig::default(),
        }
    };
    state.reload(config, llm_config).await;
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
        Some(data) => serde_json::from_value(data).unwrap_or_else(|_| BaseConfig::default()),
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
        let _ = logger.log_tx.send(LogMessage {
            time_stamp: chrono::Local::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
        });
    }
}

// 快捷键设置
#[tauri::command]
pub fn get_hotkey_config(app: tauri::AppHandle) -> HotkeyConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("hotkey") {
        Some(data) => serde_json::from_value(data).unwrap_or_else(|_| HotkeyConfig::default()),
        None => HotkeyConfig::default(),
    }
}

// 大模型配置
#[tauri::command]
pub fn get_llm_config(app: tauri::AppHandle) -> LLMConfig {
    let store = app.store(&Path::new("config.json")).unwrap();
    match store.get("llm") {
        Some(data) => serde_json::from_value(data).unwrap_or_else(|_| LLMConfig::default()),
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
pub async fn reload_llm_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<AsyncMutex<FileManager>>>,
    config: LLMConfig,
) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("llm", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    state.lock().await.reload(config);
    Ok(())
}

#[tauri::command]
pub fn save_llm_config(app: tauri::AppHandle, config: LLMConfig) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("llm", json!(config.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_summary_info_by_buffer(base64_string: String) -> Result<SummaryInfo, String> {
    let buffer = BASE64_STANDARD
        .decode(base64_string)
        .map_err(|e| e.to_string())?;
    get_summary_info_by_u8(buffer)
        .map_err(|e| e.to_string())
        .map(|summary_info| summary_info)
}

#[tauri::command]
pub async fn get_report_summary_by_buffer(
    state: tauri::State<'_, Arc<AsyncMutex<FileManager>>>,
    base64_string: String,
) -> Result<String, String> {
    let buffer = BASE64_STANDARD
        .decode(base64_string)
        .map_err(|e| e.to_string())?;
    let mut pdf_text = match read_pdf_u8(buffer.clone()) {
        Ok(pdf_read_result) => pdf_read_result.text,
        Err(_) => String::new(),
    };
    if pdf_text.trim().is_empty() {
        let base_url = state.lock().await.base_url.clone();

        if base_url != "https://api.deepseek.com" {
            // 在单独的作用域中获取锁，调用异步函数并等待结果
            pdf_text = {
                // 创建临时变量保存要传递给异步调用的数据
                let file_name = "UN38.3测试报告.pdf".to_string();
                let buffer_clone = buffer.clone();

                state
                    .lock()
                    .await
                    .get_u8_text(file_name, buffer_clone)
                    .await
                    .unwrap()
            };
        }
    }
    if pdf_text.trim().is_empty() {
        return Err("".to_string());
    }

    let summary = state
        .lock()
        .await
        .chat_with_ai_fast_and_cheap(vec![pdf_text])
        .await
        .unwrap();

    Ok(summary)
}

// 保存配置
#[tauri::command]
pub async fn save_config(app: tauri::AppHandle, config: Config) -> Result<(), String> {
    let store = app.store(&Path::new("config.json")).unwrap();
    store.set("server", json!(config.server.clone()));
    store.set("llm", json!(config.llm.clone()));
    store.set("base", json!(config.base.clone()));
    store.set("hotkey", json!(config.hotkey.clone()));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// 获取配置
#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Config {
    let store = app.store(&Path::new("config.json")).unwrap();
    Config {
        server: store
            .get("server")
            .and_then(|data| serde_json::from_value(data).ok())
            .unwrap_or_else(|| ServerConfig::default()),
        llm: store
            .get("llm")
            .and_then(|data| serde_json::from_value(data).ok())
            .unwrap_or_else(|| LLMConfig::default()),
        base: store
            .get("base")
            .and_then(|data| serde_json::from_value(data).ok())
            .unwrap_or_else(|| BaseConfig::default()),
        hotkey: store
            .get("hotkey")
            .and_then(|data| serde_json::from_value(data).ok())
            .unwrap_or_else(|| HotkeyConfig::default()),
    }
}

// 保存配置, 并重启服务器
#[tauri::command]
pub async fn reload_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, ServerManager>,
    hotkey_state: tauri::State<'_, HotkeyManager>,
    file_manager: tauri::State<'_, Arc<AsyncMutex<FileManager>>>,
    config: Config,
) -> Result<(), String> {
    state
        .reload(config.server.clone(), config.llm.clone())
        .await;

    file_manager.lock().await.reload(config.llm.clone());

    hotkey_state.stop();
    hotkey_state.save_config(config.hotkey.clone());
    hotkey_state.start();

    set_auto_start(app.clone(), config.base.auto_start)?;

    let _ = save_config(app.clone(), config.clone()).await;
    Ok(())
}

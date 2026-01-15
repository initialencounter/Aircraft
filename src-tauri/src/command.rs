use aircraft_types::config::Config;
use aircraft_types::logger::LogMessage;
use share::logger::Logger;
use share::task_proxy::webhook::SERVER_PORT;
use std::path::Path;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

use share::manager::hotkey_manager::HotkeyManager;
use share::task_proxy::LOGIN_STATUS;

// 获取登录状态
#[tauri::command]
pub async fn get_login_status() -> bool {
    let login_status = LOGIN_STATUS.load(Ordering::Relaxed);
    login_status
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

#[tauri::command]
pub fn is_listening(state: tauri::State<'_, HotkeyManager>) -> bool {
    state.is_listening()
}

#[tauri::command]
pub fn open_local_dir(target: &str) {
    share::utils::fs::open_local_dir(target);
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
pub fn maximize_window(app: tauri::AppHandle) {
    let window = app.get_webview_window("main").unwrap();
    window.maximize().unwrap();
}

#[tauri::command]
pub fn unmaximize_window(app: tauri::AppHandle) {
    let window = app.get_webview_window("main").unwrap();
    window.unmaximize().unwrap();
}

// 保存配置, 并重启服务器
#[tauri::command]
pub async fn reload_config(app: tauri::AppHandle, config: Config) -> Result<(), String> {
    set_auto_start(app.clone(), config.base.auto_start)?;
    Ok(())
}

#[tauri::command]
pub fn get_server_port() -> u16 {
    SERVER_PORT.load(std::sync::atomic::Ordering::Relaxed) as u16
}

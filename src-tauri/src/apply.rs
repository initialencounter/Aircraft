use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use crate::command::{get_hotkey_config, get_server_config};
use share::hotkey_manager::HotkeyManager;
use share::logger::Logger;
use crate::server_manager::ServerManager;
use tauri::{App, Manager};

pub fn apply(app: &mut App) {
    // 获取 app_data 目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    // 获取 app_log 目录
    let app_log_dir = app_data_dir.join("logs");
    // 初始化 logger，传入必要的路径参数
    let logger = Arc::new(Mutex::new(Logger::new(
        PathBuf::from(app_log_dir),
        "aircraft", // app数据目录
        true,       // 日志目录
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    app.manage(logger);
    let server_config = get_server_config(app.handle().clone());
    let server_manager = ServerManager::new(server_config, log_tx);
    app.manage(server_manager);
    let hotkey_config = get_hotkey_config(app.handle().clone());
    let hotkey_manager = HotkeyManager::new(hotkey_config);
    hotkey_manager.start();
    app.manage(hotkey_manager);
}

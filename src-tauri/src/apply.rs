use crate::command::get_config;
use share::manager::hotkey_manager::HotkeyManager;
use share::manager::server_manager::ServerManager;
use share::utils::uploader::FileManager;
use share::{logger::Logger, manager::clipboard_snapshot_manager::ClipboardSnapshotManager};
use std::{path::PathBuf, sync::Arc, sync::Mutex};
use tauri::{App, Manager};
use tokio::sync::Mutex as AsyncMutex;

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
        true,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    app.manage(logger);
    let config = get_config(app.handle().clone());
    let server_config = config.server.clone();
    let llm_config_clone = config.llm.clone();
    let server_manager = ServerManager::new(server_config, log_tx.clone(), llm_config_clone);
    server_manager.start();
    app.manage(server_manager);
    let hotkey_config = config.hotkey.clone();
    let hotkey_manager = HotkeyManager::new(hotkey_config, log_tx.clone());
    hotkey_manager.start();
    app.manage(hotkey_manager);
    let llm_config = config.llm.clone();
    app.manage(Arc::new(AsyncMutex::new(FileManager::new(llm_config))));
    let clipboard_snapshot_manager = ClipboardSnapshotManager::new();
    clipboard_snapshot_manager.start();
    app.manage(clipboard_snapshot_manager);
}

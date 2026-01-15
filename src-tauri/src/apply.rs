use share::config::ConfigManager;
use share::logger::Logger;
use share::manager::server_manager::ServerManager;
use std::{path::PathBuf, sync::Arc, sync::Mutex};
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
        true,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    app.manage(logger);
    let config = ConfigManager::get_config();
    let server_manager = ServerManager::new(config.server, log_tx.clone(), config.llm);
    server_manager.start();
    app.manage(server_manager);
}

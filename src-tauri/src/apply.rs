use crate::drop_zone::TauriDropZone;
use aircraft_types::logger::LogMessage;
use share::config::ConfigManager;
use share::logger::Logger;
use share::manager::drop_target_manager::DropTargetManager;
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

    // 拖拽承接窗口：确认拖拽后先占位，只记录日志，后续再接业务。
    let confirm_log_tx = log_tx.clone();
    let on_confirm: Arc<dyn Fn(Vec<String>) + Send + Sync> = Arc::new(move |files: Vec<String>| {
        let _ = confirm_log_tx.send(LogMessage {
            time_stamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            level: "INFO".to_string(),
            message: format!(
                "[拖放目标] 确认收到 {} 个文件:\n{}",
                files.len(),
                files.join("\n")
            ),
        });
    });
    let drop_target_manager = DropTargetManager::new(
        Arc::new(TauriDropZone::new(app.handle().clone())),
        on_confirm,
    );
    drop_target_manager.start();
    app.manage(drop_target_manager);

    let config = ConfigManager::get_config();
    let server_manager = ServerManager::new(config.server, log_tx.clone(), config.llm);
    server_manager.start();
    app.manage(server_manager);
}

mod config;
use config::{read_env_to_config, read_hotkey_config};
use share::{
    hotkey_manager::HotkeyManager,
    logger::Logger,
    task_proxy::run as task_proxy_run,
    types::{HotkeyConfig, ServerConfig},
};
use std::{
    env,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tokio::sync::watch;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[tokio::main]
async fn main() -> Result<()> {
    let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
    let log_dir = current_exe.parent().unwrap().join("logs");
    let config = match read_env_to_config(&current_exe) {
        Ok(config) => config,
        Err(_e) => ServerConfig::default(),
    };

    let logger = Arc::new(Mutex::new(Logger::new(
        PathBuf::from(log_dir),
        "aircraft",         // app数据目录
        config.log_enabled, // 日志目录
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);
    let _ = tokio::spawn(task_proxy_run(
        config.base_url,
        config.username,
        config.password,
        config.port,
        config.debug,
        shutdown_rx,
        log_tx,
    ));

    let hotkey_config = match read_hotkey_config(&current_exe) {
        Ok(config) => config,
        Err(_e) => HotkeyConfig::default(),
    };
    let hotkey_manager = HotkeyManager::new(hotkey_config);
    hotkey_manager.start();
    loop {
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}

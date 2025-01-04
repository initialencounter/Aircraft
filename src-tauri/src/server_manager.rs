use std::sync::atomic::AtomicBool;
use std::sync::mpsc::Sender;
use std::sync::Mutex;
use tauri::Wry;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::command::get_server_config;
use crate::config::ServerConfig;
use share::logger::LogMessage;
use crate::ziafp::run as ziafp_run;

pub struct ServerManager {
    is_running: AtomicBool,
    handle: Mutex<JoinHandle<()>>,
    config: Mutex<ServerConfig>,
    shutdown_tx: Mutex<watch::Sender<bool>>,
    log_tx: Sender<LogMessage>,
}
impl ServerManager {
    pub fn new(app_handle: tauri::AppHandle<Wry>, log_tx: Sender<LogMessage>) -> Self {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let app_handle_clone = app_handle.clone();
        let config = get_server_config(app_handle_clone);
        let config_clone = config.clone();
        let log_tx_clone = log_tx.clone();
        let handle = tokio::spawn(async move {
            let _ = ziafp_run(
                config_clone.base_url,
                config_clone.username,
                config_clone.password,
                config_clone.port,
                config_clone.debug,
                shutdown_rx,
                log_tx_clone,
            )
            .await;
        });
        let log_tx = log_tx.clone();
        Self {
            is_running: AtomicBool::new(true),
            handle: Mutex::new(handle),
            config: Mutex::new(config),
            shutdown_tx: Mutex::new(shutdown_tx),
            log_tx,
        }
    }
    pub fn start(&self) {
        if self.is_running.load(std::sync::atomic::Ordering::Relaxed) {
            println!("服务已运行");
            return;
        }
        self.is_running
            .store(true, std::sync::atomic::Ordering::Relaxed);
        let config = self.config.lock().unwrap().clone();
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let log_tx = self.log_tx.clone();
        *self.shutdown_tx.lock().unwrap() = shutdown_tx;
        *self.handle.lock().unwrap() = tokio::spawn(async move {
            let _ = ziafp_run(
                config.base_url,
                config.username,
                config.password,
                config.port,
                config.debug,
                shutdown_rx,
                log_tx,
            )
            .await;
        });
    }
    pub fn stop(&self) {
        let _ = self.shutdown_tx.lock().unwrap().send(true);
        self.is_running
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }

    pub async fn restart(&self) {
        self.stop();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        self.start();
    }
    pub fn update_config(&self, config: ServerConfig) {
        *self.config.lock().unwrap() = config;
    }
    pub async fn reload(&self, config: ServerConfig) {
        self.stop();
        self.update_config(config);
        self.start();
    }
}

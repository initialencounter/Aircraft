use tokio::task::JoinHandle;
use tokio::sync::watch;
use tauri::Wry;
use std::sync::atomic::AtomicBool;
use std::sync::mpsc::{channel, Receiver};
use std::sync::Mutex;

use crate::logger::LogMessage;
use crate::ziafp::run as ziafp_run;
use crate::config::ServerConfig;
use crate::command::get_server_config;

pub struct ServerManager {
    is_running: AtomicBool,
    handle: Mutex<JoinHandle<()>>,
    config: Mutex<ServerConfig>,
    shutdown_tx: Mutex<watch::Sender<bool>>,
    log_rx: Mutex<Receiver<LogMessage>>,
}
impl ServerManager {
    pub fn new(app_handle: tauri::AppHandle<Wry>) -> Self {
      let (shutdown_tx, shutdown_rx) = watch::channel(false);
      let (log_tx, log_rx) = channel::<LogMessage>();
      let app_handle_clone = app_handle.clone();  
      let config = get_server_config(app_handle_clone);
      let config_clone = config.clone();
        let handle = tokio::spawn(async move {
          let _ = ziafp_run(
            config_clone.base_url,
            config_clone.username,
            config_clone.password,
            config_clone.port,
            config_clone.debug,
            config_clone.log_enabled,
            shutdown_rx,
            log_tx,
          ).await;
        });
        Self { 
            is_running: AtomicBool::new(true),
            handle: Mutex::new(handle), 
            config: Mutex::new(config), 
            shutdown_tx: Mutex::new(shutdown_tx),
            log_rx: Mutex::new(log_rx),
        }
    }
    pub fn start(&self) {
        if self.is_running.load(std::sync::atomic::Ordering::Relaxed) {
            println!("服务已运行");
            return;
        }
        self.is_running.store(true, std::sync::atomic::Ordering::Relaxed);
        let config = self.config.lock().unwrap().clone();
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let (log_tx, log_rx) = channel::<LogMessage>();
        *self.shutdown_tx.lock().unwrap() = shutdown_tx;
        *self.log_rx.lock().unwrap() = log_rx;
        *self.handle.lock().unwrap() = tokio::spawn(async move {
            let _ = ziafp_run(
                config.base_url,
                config.username,
                config.password,
                config.port,
                config.debug,
                config.log_enabled,
                shutdown_rx,
                log_tx,
            ).await;
        });
    }
    pub fn stop(&self) {
        let _ = self.shutdown_tx.lock().unwrap().send(true);
        self.is_running.store(false, std::sync::atomic::Ordering::Relaxed);
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
    pub fn try_get_logs(&self) -> Vec<LogMessage> {
        let mut logs = Vec::new();
        let rx = self.log_rx.lock().unwrap();
        
        // 循环接收所有可用的日志消息
        while let Ok(log) = rx.try_recv() {
            logs.push(log);
        }
        
        logs
    }
}
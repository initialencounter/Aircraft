use std::sync::mpsc::Sender;
use std::sync::Mutex;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use share::types::ServerConfig;
use share::logger::LogMessage;
use share::task_proxy::run as task_proxy_run;

pub struct ServerManager {
    handle: Mutex<JoinHandle<()>>,
    config: Mutex<ServerConfig>,
    shutdown_tx: Mutex<watch::Sender<bool>>,
    log_tx: Sender<LogMessage>,
}
impl ServerManager {
    pub fn new(config: ServerConfig, log_tx: Sender<LogMessage>) -> Self {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let config_clone = config.clone();
        let log_tx_clone = log_tx.clone();
        let handle = tokio::spawn(async move {
            let _ = task_proxy_run(
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
            handle: Mutex::new(handle),
            config: Mutex::new(config),
            shutdown_tx: Mutex::new(shutdown_tx),
            log_tx,
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let log_tx = self.log_tx.clone();
        *self.shutdown_tx.lock().unwrap() = shutdown_tx;
        *self.handle.lock().unwrap() = tokio::spawn(async move {
            let _ = task_proxy_run(
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

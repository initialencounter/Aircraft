use std::sync::mpsc::Sender;
use std::sync::Mutex;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::config::ConfigManager;
use crate::task_proxy::run as task_proxy_run;
use aircraft_types::config::{LLMConfig, ServerConfig};
use aircraft_types::logger::LogMessage;

pub struct ServerManager {
    handle: Mutex<Option<JoinHandle<()>>>,
    pub config: Mutex<ServerConfig>,
    pub llm_config: Mutex<LLMConfig>,
    shutdown_tx: Mutex<watch::Sender<bool>>,
    log_tx: Sender<LogMessage>,
}

impl ServerManager {
    pub fn new(config: ServerConfig, log_tx: Sender<LogMessage>, llm_config: LLMConfig) -> Self {
        let (shutdown_tx, _shutdown_rx) = watch::channel(false);
        let log_tx = log_tx.clone();
        Self {
            handle: Mutex::new(None),
            config: Mutex::new(config),
            llm_config: Mutex::new(llm_config),
            shutdown_tx: Mutex::new(shutdown_tx),
            log_tx,
        }
    }

    pub fn start(&self) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let log_tx = self.log_tx.clone();
        *self.shutdown_tx.lock().unwrap() = shutdown_tx;
        *self.handle.lock().unwrap() = Some(tokio::spawn(async move {
            let _ = task_proxy_run(shutdown_rx, log_tx).await;
        }));
    }

    pub fn stop(&self) {
        let _ = self.shutdown_tx.lock().unwrap().send(true);
    }

    pub async fn restart(&self) {
        self.stop();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        self.start();
    }
    pub fn update_config(&self, config: ServerConfig, llm_config: LLMConfig) {
        *self.config.lock().unwrap() = config;
        *self.llm_config.lock().unwrap() = llm_config;
    }

    pub async fn reload(&self) {
        self.stop();
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        let config = ConfigManager::get_config();
        self.update_config(config.server, config.llm);
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        self.start();
    }
}

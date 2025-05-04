use std::sync::mpsc::Sender;
use std::sync::Mutex;
use crate::types::LLMConfig;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::logger::LogMessage;
use crate::task_proxy::run as task_proxy_run;
use crate::types::ServerConfig;


pub struct ServerManager {
    handle: Mutex<Option<JoinHandle<()>>>,
    config: Mutex<ServerConfig>,
    llm_config:  Mutex<LLMConfig>,
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
        let config = self.config.lock().unwrap().clone();
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let log_tx = self.log_tx.clone();
        *self.shutdown_tx.lock().unwrap() = shutdown_tx;
        let llm_config = self.llm_config.lock().unwrap().clone();
        *self.handle.lock().unwrap() =  Some(tokio::spawn(async move {
            let _ = task_proxy_run(
                config.base_url,
                config.username,
                config.password,
                config.port,
                config.debug,
                shutdown_rx,
                log_tx,
                llm_config,
            )
            .await;
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

    pub fn reload(&self, config: ServerConfig, llm_config: LLMConfig) {
        self.stop();
        self.update_config(config, llm_config);
        self.start();
    }
}

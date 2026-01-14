#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};

use aircraft_types::config::Config;
use aircraft_types::logger::LogMessage;
use share::config::ConfigManager;
use share::logger::Logger;
use share::manager::server_manager::ServerManager;
use share::task_proxy::webhook::SERVER_PORT;
use share::task_proxy::LOGIN_STATUS;

#[napi(js_name = "AircraftRs")]
pub struct AircraftRs {
  log_tx: Sender<LogMessage>,
  logger: Arc<Mutex<Logger>>,
}

#[napi]
impl AircraftRs {
  #[napi(constructor)]
  pub fn new(app_log_dir: String) -> Self {
    let config = ConfigManager::get_config();
    let logger = Arc::new(Mutex::new(Logger::new(
      PathBuf::from(app_log_dir),
      "aircraft",                // app数据目录
      config.server.log_enabled, // 日志目录
      true,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    let server_manager = ServerManager::new(config.server, log_tx.clone(), config.llm);
    server_manager.start();
    Self { log_tx, logger }
  }

  #[napi]
  pub fn write_log(&self, log: LogMessage) -> napi::Result<()> {
    self.log_tx.send(log).unwrap();
    Ok(())
  }

  #[napi]
  pub fn try_get_logs(&self) -> napi::Result<Vec<LogMessage>> {
    let logs = self.logger.lock().unwrap().try_get_logs();
    Ok(logs)
  }
}

#[napi]
pub fn get_default_config() -> napi::Result<Config> {
  let config = Config::default();
  Ok(config)
}

#[napi]
pub fn open_local_dir(target: String) {
  share::utils::fs::open_local_dir(&target);
}

#[napi]
pub fn get_login_status() -> bool {
  LOGIN_STATUS.load(std::sync::atomic::Ordering::Relaxed)
}

#[napi]
pub fn get_config() -> napi::Result<Config> {
  let config = share::config::ConfigManager::get_config();
  Ok(config)
}

#[napi]
pub fn save_config(config: Config) -> napi::Result<()> {
  let _ = share::config::ConfigManager::save_config(&config);
  Ok(())
}

#[napi]
pub fn get_server_port() -> u16 {
  SERVER_PORT.load(std::sync::atomic::Ordering::Relaxed) as u16
}

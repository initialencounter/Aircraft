#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use aircraft_types::attachment::AttachmentInfo;
use aircraft_types::config::{Config, HotkeyConfig, LLMConfig, ServerConfig};
use aircraft_types::logger::LogMessage;
use aircraft_types::others::ClipboardHotkey;
use aircraft_types::summary::SummaryInfo;
use pdf_parser::read::read_pdf_u8;
use pdf_parser::PdfReadResult;
use share::attachment_parser::{get_attachment_info as get_attachment_info_rs};
use share::logger::Logger;
use share::manager::clipboard_snapshot_manager::ClipboardSnapshotManager;
use share::manager::hotkey_manager::HotkeyManager;
use share::manager::server_manager::ServerManager;
use share::task_proxy::webhook::SERVER_PORT;
use share::utils::uploader::FileManager;
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};
use summary::{get_summary_info_by_buffer, get_summary_info_by_path};
use share::task_proxy::LOGIN_STATUS;

#[napi(js_name = "AircraftRs")]
pub struct AircraftRs {
  server_manager: ServerManager,
  hotkey_manager: HotkeyManager,
  clipboard_snapshot_manager: ClipboardSnapshotManager,
  log_tx: Sender<LogMessage>,
  logger: Arc<Mutex<Logger>>,
}

#[napi]
impl AircraftRs {
  #[napi(constructor)]
  pub fn new(
    app_log_dir: String,
    config: ServerConfig,
    llm_config: LLMConfig,
    hotkey_config: HotkeyConfig,
  ) -> Self {
    let logger = Arc::new(Mutex::new(Logger::new(
      PathBuf::from(app_log_dir),
      "aircraft", // app数据目录
      true,       // 日志目录
      true,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    Self {
      server_manager: ServerManager::new(config, log_tx.clone(), llm_config),
      hotkey_manager: HotkeyManager::new(hotkey_config, log_tx.clone()),
      clipboard_snapshot_manager: ClipboardSnapshotManager::new(),
      log_tx,
      logger,
    }
  }
  #[napi]
  pub fn start_server(&self) -> napi::Result<()> {
    self.server_manager.start();
    Ok(())
  }

  #[napi]
  pub fn stop_server(&self) -> napi::Result<()> {
    self.server_manager.stop();
    Ok(())
  }

  #[napi]
  pub fn get_summary_info_by_path(&self, path: String) -> napi::Result<SummaryInfo> {
    let contents = get_summary_info_by_path(&path);
    match contents {
      Ok(contents) => Ok(contents),
      Err(e) => {
        return Err(napi::Error::new(
          napi::Status::GenericFailure,
          e.to_string(),
        ))
      }
    }
  }

  #[napi]
  pub fn get_summary_info_by_buffer(&self, buffer: &[u8]) -> napi::Result<SummaryInfo> {
    let contents = get_summary_info_by_buffer(buffer);
    match contents {
      Ok(contents) => Ok(contents),
      Err(e) => {
        return Err(napi::Error::new(
          napi::Status::GenericFailure,
          e.to_string(),
        ))
      }
    }
  }

  #[napi]
  pub async fn get_attachment_info(
    &self,
    project_no: String,
    is_965: bool,
  ) -> napi::Result<AttachmentInfo> {
    let attachment = get_attachment_info_rs(project_no, is_965).await;
    match attachment {
      Ok(attachment) => Ok(attachment),
      Err(e) => {
        return Err(napi::Error::new(
          napi::Status::GenericFailure,
          e.to_string(),
        ))
      }
    }
  }

  #[napi]
  pub fn get_current_server_config(&self) -> napi::Result<ServerConfig> {
    let config = self.server_manager.config.lock().unwrap().clone();
    Ok(config)
  }

  #[napi]
  pub fn get_current_llm_config(&self) -> napi::Result<LLMConfig> {
    let llm_config = self.server_manager.llm_config.lock().unwrap().clone();
    Ok(llm_config)
  }

  #[napi]
  pub fn get_current_hotkey_config(&self) -> napi::Result<HotkeyConfig> {
    let hotkey_config = self.hotkey_manager.config.lock().unwrap().clone();
    Ok(hotkey_config)
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

  #[napi]
  pub fn reload_clipboard_snapshot_configs(&self) -> napi::Result<()> {
    self.clipboard_snapshot_manager.stop();
    self.clipboard_snapshot_manager.start();
    Ok(())
  }

  #[napi]
  pub fn start_clipboard_snapshot_manager(&self) -> napi::Result<()> {
    self.clipboard_snapshot_manager.start();
    Ok(())
  }
}

#[napi(js_name = "FileManager")]
pub struct JsFileManager {
  manager: FileManager,
}

#[napi]
impl JsFileManager {
  #[napi(constructor)]
  pub fn new(base_url: String, api_key: String, model: String) -> Self {
    let manager = FileManager::new(LLMConfig {
      base_url,
      api_key,
      model,
    });
    Self { manager }
  }

  /// 直接读取pdf文件路径，输出解析结果，所有操作通过API完成
  #[napi]
  pub async fn parse_pdf(&self, path: Vec<String>) -> napi::Result<String> {
    let res = self.manager.chat_with_ai(path).await.unwrap();
    Ok(res)
  }
  /// 使用 API 上传文件并获取 OCR 内容
  #[napi]
  pub async fn parse_pdf_u8(&self, filename: String, buffer: Vec<u8>) -> napi::Result<String> {
    let res = self.manager.get_u8_text(filename, buffer).await.unwrap();
    Ok(res)
  }
  /// 输出 pdf 文本，输出解析结果
  #[napi]
  pub async fn chat_with_ai_fast_and_cheap(
    &self,
    file_contents: Vec<String>,
  ) -> napi::Result<String> {
    match self
      .manager
      .chat_with_ai_fast_and_cheap(file_contents)
      .await
    {
      Ok(res) => Ok(res),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        format!("调用 fast and cheap 接口失败: {}", e),
      )),
    }
  }
  /// 使用 pdf_extract 读取 pdf 文件的文本内容
  #[napi]
  pub async fn read_pdf_buffer(&self, buffer: &[u8]) -> napi::Result<String> {
    let res: PdfReadResult = read_pdf_u8(buffer).unwrap();
    Ok(res.text)
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
pub fn get_clipboard_snapshot_configs() -> Vec<ClipboardHotkey> {
  share::manager::clipboard_snapshot_manager::get_clipboard_snapshot_configs()
}

#[napi]
pub fn add_clipboard_snapshot_config(config: ClipboardHotkey) -> napi::Result<()> {
  match share::manager::clipboard_snapshot_manager::add_clipboard_snapshot_config(config) {
    Ok(_) => Ok(()),
    Err(e) => Err(napi::Error::new(
      napi::Status::GenericFailure,
      format!("添加剪贴板快照配置失败: {}", e),
    )),
  }
}

#[napi]
pub fn remove_clipboard_snapshot_config(content_name: String) -> napi::Result<()> {
  match share::manager::clipboard_snapshot_manager::remove_clipboard_snapshot_config(&content_name)
  {
    Ok(_) => Ok(()),
    Err(e) => Err(napi::Error::new(
      napi::Status::GenericFailure,
      format!("移除剪贴板快照配置失败: {}", e),
    )),
  }
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
pub fn get_server_port() -> u16 {
  SERVER_PORT.load(std::sync::atomic::Ordering::Relaxed) as u16
}
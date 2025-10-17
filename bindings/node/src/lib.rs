#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use share::attachment_parser::{get_attachment_info as get_attachment_info_rs, AttachmentInfo};
use share::logger::{LogMessage, Logger};
use share::manager::hotkey_manager::HotkeyManager;
use share::manager::server_manager::ServerManager;
use share::pdf_parser::parse::parse_good_file;
use share::pdf_parser::read::{read_pdf, read_pdf_u8, PdfReadResult};
use share::pdf_parser::types::GoodsInfo;
use share::pdf_parser::uploader::FileManager;
use share::summary_rs::{get_summary_info_by_buffer, get_summary_info_by_path, SummaryInfo};
use share::types::{Config, LLMConfig};
use share::types::{HotkeyConfig, ServerConfig};
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};

#[napi(js_name = "AircraftRs")]
pub struct AircraftRs {
  server_manager: ServerManager,
  hotkey_manager: HotkeyManager,
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
      hotkey_manager: HotkeyManager::new(hotkey_config),
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
  pub async fn reload_server(
    &self,
    server_config: ServerConfig,
    llm_config: LLMConfig,
  ) -> napi::Result<()> {
    self.server_manager.reload(server_config, llm_config).await;
    Ok(())
  }

  #[napi]
  pub fn start_hotkey(&self) -> napi::Result<()> {
    self.hotkey_manager.start();
    Ok(())
  }
  #[napi]
  pub fn stop_hotkey(&self) -> napi::Result<()> {
    self.hotkey_manager.stop();
    Ok(())
  }

  #[napi]
  pub fn reload_hotkey(&self, config: HotkeyConfig) -> napi::Result<()> {
    self.stop_hotkey()?;
    self.hotkey_manager.save_config(config);
    self.start_hotkey()?;
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
  pub fn get_summary_info_by_buffer(&self, buffer: Vec<u8>) -> napi::Result<SummaryInfo> {
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
  pub fn parse_goods_info(&self, path: String, is_965: bool) -> napi::Result<GoodsInfo> {
    let pdf_text = match read_pdf(&path, false) {
      Ok(result) => result.text,
      Err(_) => "".to_string(),
    };
    let goods_info = match parse_good_file(pdf_text, is_965) {
      Ok(goods_info) => goods_info,
      Err(_) => GoodsInfo {
        project_no: "".to_string(),
        item_c_name: "".to_string(),
        labels: vec![],
      },
    };
    Ok(goods_info)
  }

  #[napi]
  pub async fn get_attachment_info(
    &self,
    project_no: String,
    is_965: bool,
  ) -> napi::Result<AttachmentInfo> {
    let attachment = get_attachment_info_rs(project_no, false, is_965).await;
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
  #[napi]
  pub async unsafe fn reload(
    &mut self,
    base_url: String,
    api_key: String,
    model: String,
  ) -> napi::Result<()> {
    let llm_config = LLMConfig {
      base_url,
      api_key,
      model,
    };
    let _ = self.manager.reload(llm_config);
    Ok(())
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
    let res = self
      .manager
      .chat_with_ai_fast_and_cheap(file_contents)
      .await
      .unwrap();
    Ok(res)
  }
  /// 使用 pdf_extract 读取 pdf 文件的文本内容
  #[napi]
  pub async fn read_pdf_buffer(&self, buffer: Vec<u8>) -> napi::Result<String> {
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
pub async fn search_file(file_name: String) -> Vec<share::hotkey_handler::copy::SearchResult> {
    share::hotkey_handler::copy::search(file_name).await
}

#[napi]
pub async fn search_property(url: String, search_text: String) -> Vec<share::hotkey_handler::copy::DataModel> {
    share::hotkey_handler::copy::search_property(url, search_text).await
}

#[napi]
pub fn open_local_dir(target: String) {
    share::utils::fs::open_local_dir(&target);
}

#[napi]
pub fn set_clipboard_text(text: String) {
    share::utils::set_clipboard_text(text);
}
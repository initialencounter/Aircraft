#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use pdf_parser::parse::{parse_good_file, GoodsPDF};
use pdf_parser::read::{read_pdf, read_pdf_u8, PdfReadResult};
use pdf_parser::types::LLMConfig;
use pdf_parser::uploader::FileManager;
use serde::{Deserialize, Serialize};
use summary_rs::{parse_docx_table, parse_docx_text, read_docx_content};

#[napi(js_name = "AircraftRs")]
pub struct AircraftRs {}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoodsInfo {
  project_no: String,
  name: String,
  labels: Vec<String>,
}

#[napi]
impl AircraftRs {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {}
  }

  #[napi]
  pub fn get_summary_info(&self, path: String) -> napi::Result<String> {
    let contents = match read_docx_content(&path, vec!["word/document.xml".to_string()]) {
      Ok(contents) => contents,
      Err(e) => {
        return Err(napi::Error::new(
          napi::Status::GenericFailure,
          e.to_string(),
        ))
      }
    };
    let content = parse_docx_text(&contents[0]);
    let summary = parse_docx_table(content);
    Ok(serde_json::to_string(&summary).unwrap())
  }

  #[napi]
  pub fn parse_goods_info(&self, path: String, is_965: bool) -> napi::Result<String> {
    let pdf_text = match read_pdf(&path, false) {
      Ok(result) => result.text,
      Err(_) => "".to_string(),
    };
    let goods_info = match parse_good_file(pdf_text, is_965) {
      Ok(goods_info) => goods_info,
      Err(_) => GoodsPDF {
        project_no: "".to_string(),
        item_c_name: "".to_string(),
      },
    };
    let goods_info = GoodsInfo {
      project_no: goods_info.project_no,
      name: goods_info.item_c_name,
      labels: vec![],
    };
    Ok(serde_json::to_string(&goods_info).unwrap())
  }
}

#[napi(js_name = "FileManager")]
pub struct FileManagerInstance {
  manager: FileManager,
}

#[napi]
impl FileManagerInstance {
  #[napi(constructor)]
  pub fn new(base_url: String, api_key: String, model: String) -> Self {
    let manager = FileManager::new(LLMConfig{
      base_url, api_key, model
    });
    Self { manager }
  }
  #[napi]
  pub async fn parse_pdf(&self, path: Vec<String>) -> napi::Result<String> {
    let res = self.manager.chat_with_ai(path).await.unwrap();
    Ok(res)
  }
  #[napi]
  pub async fn parse_pdf_u8(&self,filename: String, buffer: Vec<u8>) -> napi::Result<String> {
    let res = self.manager.get_u8_text(filename, buffer).await.unwrap();
    Ok(res)
  }
  #[napi]
  pub async fn chat_with_ai_fast_and_cheap(&self, file_contents: Vec<String>) -> napi::Result<String> {
    let res = self.manager.chat_with_ai_fast_and_cheap(file_contents).await.unwrap();
    Ok(res)
  }
  #[napi]
  pub async fn read_pdf_buffer(&self, buffer: Vec<u8>) -> napi::Result<String> {
    let res: PdfReadResult = read_pdf_u8(buffer).unwrap();
    Ok(res.text)
  }
}

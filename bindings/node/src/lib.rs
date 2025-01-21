#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use pdf_parser::parse::{parse_good_file, GoodsPDF};
use pdf_parser::read::read_pdf;
use summary_rs::{parse_docx_table, parse_docx_text, read_docx_content};

#[napi(js_name = "HeadlessManager")]
pub struct HeadlessManager {}

#[napi]
impl HeadlessManager {
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
  pub fn parse_goods_info(&self, path: String) -> napi::Result<String> {
    let pdf_text = match read_pdf(&path) {
      Ok(result) => result.text,
      Err(_) => "".to_string(),
    };
    let goods_info = match parse_good_file(pdf_text) {
      Ok(goods_info) => goods_info,
      Err(_) => GoodsPDF {
        project_no: "".to_string(),
        item_c_name: "".to_string(),
      },
    };
    Ok(serde_json::to_string(&goods_info).unwrap())
  }
}

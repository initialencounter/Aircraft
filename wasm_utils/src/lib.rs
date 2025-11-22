use serde_wasm_bindgen::from_value;
use wasm_bindgen::prelude::*;
use summary::{get_summary_info_by_buffer};
use pdf_parser::read::{read_pdf_u8};

#[wasm_bindgen]
pub fn add(buffer: &[u8]) -> Result<String, JsError> {
    let info = get_summary_info_by_buffer(buffer).unwrap();

    Ok(info.cn_name)
}

#[wasm_bindgen]
pub fn get_pdf_title(buffer: &[u8]) -> Result<String, JsError> {
    let pdf = read_pdf_u8(buffer).unwrap();
    Ok(pdf.text)
}
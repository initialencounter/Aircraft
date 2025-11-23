use wasm_bindgen::prelude::*;
use summary::{SummaryInfo, get_summary_info_by_buffer};
use pdf_parser::read::{PdfReadResult, read_pdf_u8};

#[wasm_bindgen]
pub fn get_summary_info(buffer: &[u8]) -> Result<SummaryInfo, JsError> {
    let info = get_summary_info_by_buffer(buffer)
        .map_err(|e| JsError::new(&format!("Failed to get summary info: {}", e)))?;
    Ok(info)
}

#[wasm_bindgen]
pub fn get_goods_info(buffer: &[u8], require_image: bool) -> Result<PdfReadResult, JsError> {
    let pdf = read_pdf_u8(buffer, require_image).unwrap();
    Ok(pdf)
}
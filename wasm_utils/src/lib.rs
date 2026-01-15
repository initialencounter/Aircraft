use aircraft_types::summary::SummaryInfo;
use pdf_parser::read::read_pdf_u8;
use serde::{Deserialize, Serialize};
use summary::get_summary_info_by_buffer;
use tsify::Tsify;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_summary_info(buffer: &[u8]) -> Result<SummaryInfo, JsError> {
    let info = get_summary_info_by_buffer(buffer)
        .map_err(|e| JsError::new(&format!("Failed to get summary info: {}", e)))?;
    Ok(info)
}

#[derive(Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GoodsInfoWasm {
    pub project_no: String,
    pub item_c_name: String,
    pub labels: Vec<String>,
    pub image: Option<Vec<u8>>,
}

#[wasm_bindgen]
pub fn get_goods_info(buffer: &[u8], is_965: bool) -> Result<GoodsInfoWasm, JsValue> {
    let pdf = match read_pdf_u8(buffer) {
        Ok(result) => result,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to read PDF: {}", e))),
    };

    let goods_info = match pdf_parser::parse::parse_good_file(pdf.text, is_965, None) {
        Ok(info) => info,
        Err(e) => {
            return Err(JsValue::from_str(&format!(
                "Failed to parse goods info: {}",
                e
            )));
        }
    };

    Ok(GoodsInfoWasm {
        project_no: goods_info.project_no,
        item_c_name: goods_info.item_c_name,
        labels: goods_info.labels,
        image: pdf.image,
    })
}

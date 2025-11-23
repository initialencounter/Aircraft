// PDF Parser 相关类型定义

#[cfg(feature = "napi-support")]
use napi_derive::napi;
#[cfg(feature = "wasm-support")]
use tsify::Tsify;

use serde::{Deserialize, Serialize};

use crate::yolo::SegmentResult;

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct GoodsInfo {
    pub project_no: String,
    pub item_c_name: String,
    pub labels: Vec<String>,
    pub segment_results: Vec<SegmentResult>,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct PdfReadResult {
    pub text: String,
    pub images: Option<Vec<u8>>,
}

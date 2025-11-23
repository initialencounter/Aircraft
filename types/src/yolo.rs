// YOLO 相关类型定义

#[cfg(feature = "napi-support")]
use napi_derive::napi;
#[cfg(feature = "wasm-support")]
use tsify::Tsify;

use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct SegmentResult {
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
    pub label: String,
    pub confidence: f64,
    pub mask: Vec<Vec<u8>>,
}

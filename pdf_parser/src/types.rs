#[cfg(feature = "napi-support")]
use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm-support")]
use tsify::Tsify;
use yolo::segment::SegmentResult;

#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoodsInfo {
    pub project_no: String,
    pub item_c_name: String,
    pub labels: Vec<String>,
    pub segment_result: Vec<SegmentResult>,
}

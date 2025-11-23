#[cfg(feature = "napi-support")]
use napi_derive::napi;
#[cfg(feature = "wasm-support")]
use tsify::Tsify;

use serde::{Deserialize, Serialize};

use crate::pdf_parser::GoodsInfo;
use crate::summary::SummaryInfo;

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct OtherInfo {
    pub stack_evaluation: bool,
    pub project_dir: String,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub summary: SummaryInfo,
    pub goods: GoodsInfo,
    pub other: OtherInfo,
}

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
pub struct DataModel {
    pub id: i32,
    pub appraiser_name: String,
    pub assignee_name: String,
    pub auditor_name: Option<String>,
    pub conclusions: Option<i32>,
    pub display_status: String,
    pub next_year: Option<i8>,
    pub principal_name: Option<String>,
    pub project_id: String,
    pub project_no: Option<String>,
    pub repeat: i8,
    pub report_type: i32,
    pub submit_date: String,
    pub surveyor_names: Option<String>,
    pub system_id: String,
    pub self_id: String,
    pub item_c_name: Option<String>,
    pub item_e_name: Option<String>,
    pub mnotes: Option<String>,
    pub report_no: Option<String>,
    pub tnotes: Option<String>,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct SearchPropertyParams {
    pub search_text: String,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct SearchProperty {
    pub url: String,
    pub search_text: String,
}

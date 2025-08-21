use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[napi(object)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoodsInfo {
    pub project_no: String,
    pub item_c_name: String,
    pub labels: Vec<String>,
}

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
pub struct FileUploadResult {
    pub bytes: i64,

    pub created_at: i64,

    pub filename: String,

    pub id: String,

    pub object: String,

    pub purpose: String,

    pub status: String,

    pub status_details: String,
}

/// PdfReadResult
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct PdfReadResult {
    pub content: String,

    pub file_type: String,

    pub filename: String,

    pub title: String,

    #[serde(rename = "type")]
    pub content_type: String,
}

/// PdfDeleteResult
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct PdfDeleteResult {
    pub deleted: bool,

    pub id: String,

    pub object: String,
}

/// ChatRequest
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct ChatRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub temperature: f64,
    pub response_format: ResponseFormat,
}

/// ChatResponse
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct ChatResponse {
    pub choices: Vec<Choice>,

    pub created: i64,

    pub id: String,

    pub model: String,

    pub object: String,

    pub usage: Usage,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct Choice {
    pub finish_reason: Option<String>,

    pub index: Option<i64>,

    pub message: Option<Message>,
}

/// Message
#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct Message {
    pub content: String,

    pub role: String,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct Usage {
    pub completion_tokens: i64,

    pub prompt_tokens: i64,

    pub total_tokens: i64,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
pub struct ResponseFormat {
    #[serde(rename = "type")]
    pub response_format_type: String,
}

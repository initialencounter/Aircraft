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
pub struct BaseConfig {
    // 暗号
    pub nothing: String,
    pub auto_start: bool,
    pub silent_start: bool,
}

impl BaseConfig {
    pub fn default() -> Self {
        BaseConfig {
            nothing: "".to_string(),
            auto_start: false,
            silent_start: false,
        }
    }
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    pub base_url: String,
    pub username: String,
    pub password: String,
    pub port: u16,
    pub debug: bool,
    pub log_enabled: bool,
}

impl ServerConfig {
    pub fn default() -> Self {
        ServerConfig {
            base_url: "".to_string(),
            username: "".to_string(),
            password: "".to_string(),
            port: 25455,
            debug: true,
            log_enabled: false,
        }
    }
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct CustomHotkey {
    pub hotkey: String,
    pub cmd: String,
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub upload_enable: bool,
    pub upload_key: String,
    pub copy_enable: bool,
    pub copy_key: String,
    pub custom_hotkey: Vec<CustomHotkey>,
}
impl HotkeyConfig {
    pub fn default() -> Self {
        HotkeyConfig {
            upload_enable: false,
            upload_key: "ctrl+shift+u".to_string(),
            copy_enable: false,
            copy_key: "ctrl+shift+z".to_string(),
            custom_hotkey: vec![CustomHotkey {
                hotkey: "ctrl+NUMPADADD".to_string(),
                cmd: "calc".to_string(),
            }],
        }
    }
}

#[cfg_attr(feature = "napi-support", napi(object, js_name = "LLMConfig"))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct LLMConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

impl LLMConfig {
    pub fn default() -> Self {
        LLMConfig {
            base_url: "https://api.moonshot.cn/v1".to_string(),
            api_key: "".to_string(),
            model: "moonshot-v1-128k".to_string(),
        }
    }
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub base: BaseConfig,
    pub server: ServerConfig,
    pub hotkey: HotkeyConfig,
    pub llm: LLMConfig,
    pub other: OtherConfig,
}

impl Config {
    pub fn default() -> Self {
        Config {
            base: BaseConfig::default(),
            server: ServerConfig::default(),
            hotkey: HotkeyConfig::default(),
            llm: LLMConfig::default(),
            other: OtherConfig::default(),
        }
    }
}

#[cfg_attr(feature = "napi-support", napi(object))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm-support", derive(Tsify))]
#[cfg_attr(feature = "wasm-support", tsify(into_wasm_abi, from_wasm_abi))]
#[serde(rename_all = "camelCase")]
pub struct OtherConfig {
    pub query_server_host: String,
}

impl OtherConfig {
    pub fn default() -> Self {
        OtherConfig {
            query_server_host: "192.168.0.195".to_string(),
        }
    }
}

use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[napi(object)]
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
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

#[napi(object)]
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
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

#[napi(object)]
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub doc_enable: bool,
    pub doc_key: String,
    pub upload_enable: bool,
    pub upload_key: String,
    pub copy_enable: bool,
    pub copy_key: String,
    pub docx_enable: bool,
    pub docx_key: String,
    pub inspector: String,
    pub signature_width: i32,
    pub signature_height: i32,
}
impl HotkeyConfig {
    pub fn default() -> Self {
        HotkeyConfig {
            doc_enable: false,
            doc_key: "ctrl+shift+d".to_string(),
            upload_enable: false,
            upload_key: "ctrl+shift+u".to_string(),
            copy_enable: false,
            copy_key: "ctrl+shift+z".to_string(),
            docx_enable: false,
            docx_key: "ctrl+shift+x".to_string(),
            inspector: "".to_string(),
            signature_width: 558,
            signature_height: 173,
        }
    }
}

#[napi(js_name="LLMConfig", object)]
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
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

#[napi(object)]
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub base: BaseConfig,
    pub server: ServerConfig,
    pub hotkey: HotkeyConfig,
    pub llm: LLMConfig,
}

impl Config {
    pub fn default() -> Self {
        Config {
            base: BaseConfig::default(),
            server: ServerConfig::default(),
            hotkey: HotkeyConfig::default(),
            llm: LLMConfig::default(),
        }
    }
}
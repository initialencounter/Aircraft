use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
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

#[derive(Serialize, Deserialize, Clone, Debug)]
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

#[derive(Serialize, Deserialize, Clone, Debug)]
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
    pub signature_width: f32,
    pub signature_height: f32,
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
            signature_width: 5.58,
            signature_height: 1.73,
        }
    }
}

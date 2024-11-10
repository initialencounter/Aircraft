use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BaseConfig {
    pub auto_login: bool,
    pub auto_start: bool,
    pub silent_start: bool,
}

impl BaseConfig {
    pub fn default() -> Self {
        BaseConfig {
            auto_login: false,
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
            port: 8080,
            debug: false,
            log_enabled: false,
        }
    }
}

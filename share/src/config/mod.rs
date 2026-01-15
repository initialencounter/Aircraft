use aircraft_types::config::Config;
use known_folders::{get_known_folder_path, KnownFolder};
use lazy_static::lazy_static;
use std::path::PathBuf;

lazy_static! {
    pub static ref CONFIG_PATH: PathBuf = get_known_folder_path(KnownFolder::RoamingAppData)
        .unwrap()
        .join("electron.initialencounter.aircraft")
        .join("config.json");
}
pub struct ConfigManager {}

impl ConfigManager {
    pub fn get_config() -> Config {
        match std::fs::read_to_string(&*CONFIG_PATH) {
            Ok(content) => match serde_json::from_str::<Config>(&content) {
                Ok(config) => {
                    return config;
                }
                Err(e) => {
                    println!("Failed to parse config file: {}", e);
                    Config::default()
                }
            },
            Err(e) => {
                println!("Failed to read config file: {}", e);
                Config::default()
            }
        }
    }

    pub fn save_config(config: &Config) {
        if let Some(parent) = CONFIG_PATH.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        let content = serde_json::to_string_pretty(config).unwrap();
        std::fs::write(&*CONFIG_PATH, content).unwrap();
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_config_path() {
        println!("Config path: {:?}", &*CONFIG_PATH);
    }
}

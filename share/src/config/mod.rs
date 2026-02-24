use aircraft_types::config::Config;
use known_folders::{get_known_folder_path, KnownFolder};
use lazy_static::lazy_static;
use std::path::PathBuf;
use std::sync::Mutex;

lazy_static! {
    pub static ref CONFIG_PATH: PathBuf = get_known_folder_path(KnownFolder::RoamingAppData)
        .unwrap()
        .join("electron.initialencounter.aircraft")
        .join("config.json");
    
    // 配置缓存，使用 Mutex 保证线程安全
    static ref CONFIG_CACHE: Mutex<Option<Config>> = Mutex::new(None);
}
pub struct ConfigManager {}

impl ConfigManager {
    pub fn get_config() -> Config {
        // 首先尝试从缓存获取配置
        {
            let cache = CONFIG_CACHE.lock().unwrap();
            if let Some(cached_config) = cache.as_ref() {
                return cached_config.clone();
            }
        }
        
        // 缓存中没有，从文件读取
        let config = Self::load_config_from_file();
        
        // 将配置保存到缓存
        {
            let mut cache = CONFIG_CACHE.lock().unwrap();
            *cache = Some(config.clone());
        }
        
        config
    }

    pub fn save_config(config: &Config) {
        if let Some(parent) = CONFIG_PATH.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        let content = serde_json::to_string_pretty(config).unwrap();
        std::fs::write(&*CONFIG_PATH, content).unwrap();
        
        // 更新缓存
        {
            let mut cache = CONFIG_CACHE.lock().unwrap();
            *cache = Some(config.clone());
        }
    }
    
    /// 从文件加载配置的私有方法
    fn load_config_from_file() -> Config {
        match std::fs::read_to_string(&*CONFIG_PATH) {
            Ok(content) => match serde_json::from_str::<Config>(&content) {
                Ok(config) => config,
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
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_config_path() {
        println!("Config path: {:?}", &*CONFIG_PATH);
    }
}

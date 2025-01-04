use std::{env, path::PathBuf};


type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
pub struct Config {
    pub base_url: String,
    pub username: String,
    pub password: String,
    pub port: u16,
    pub debug: bool,
    pub log_enabled: bool,
}

pub fn read_env_to_config(current_exe: &PathBuf) -> Result<Config> {
    let env_file_path = format!(
        "{}/local.env",
        current_exe.parent().unwrap().to_str().unwrap()
    );
    dotenv::from_path(env_file_path).ok();
    let base_url = env::var("BASE_URL").expect("Error reading BASE_URL");
    let username = env::var("USER_NAME").expect("Error reading USER_NAME");
    let password = env::var("PASSWORD").expect("Error reading PASSWORD");
    let port = env::var("PORT")?.parse::<u16>().unwrap_or(25455);
    let debug = env::var("DEBUG")?.parse::<bool>().unwrap_or(false);
    let log_enabled = env::var("LOG_ENABLED")?.parse::<bool>().unwrap_or(false);
    Ok(Config {
        base_url,
        username,
        password,
        port,
        debug,
        log_enabled,
    })
}

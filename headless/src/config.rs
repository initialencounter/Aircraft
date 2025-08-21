use share::types::ServerConfig;
use std::{env, path::PathBuf};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn read_env_to_config(current_exe: &PathBuf) -> Result<ServerConfig> {
    let env_file_path = format!(
        "{}/local.env",
        current_exe.parent().unwrap().to_str().unwrap()
    );
    dotenv::from_path(env_file_path).ok();
    let base_url = env::var("BASE_URL")?;
    let username = env::var("USER_NAME")?;
    let password = env::var("PASSWORD")?;
    let port = env::var("PORT")?.parse::<u16>()?;
    let debug = env::var("DEBUG")?.parse::<bool>()?;
    let log_enabled = env::var("LOG_ENABLED")?.parse::<bool>()?;
    Ok(ServerConfig {
        base_url,
        username,
        password,
        port,
        debug,
        log_enabled,
    })
}

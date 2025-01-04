use std::{env, path::PathBuf};
use share::types::{ServerConfig, HotkeyConfig};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn read_env_to_config(current_exe: &PathBuf) -> Result<ServerConfig> {
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
    Ok(ServerConfig {
        base_url,
        username,
        password,
        port,
        debug,
        log_enabled,
    })
}

pub fn read_hotkey_config(current_exe: &PathBuf) -> Result<HotkeyConfig> {
    let env_file_path = format!(
        "{}/local.env",
        current_exe.parent().unwrap().to_str().unwrap()
    );
    println!("{}", env_file_path);
    dotenv::from_path(env_file_path).ok();
    let doc_enable = env::var("DOC_ENABLE")?.parse::<bool>().unwrap_or(false);
    let doc_key = env::var("DOC_KEY").unwrap_or("ctrl+shift+d".to_string());
    let upload_enable = env::var("UPLOAD_ENABLE")?.parse::<bool>().unwrap_or(false);
    let upload_key = env::var("UPLOAD_KEY").unwrap_or("ctrl+shift+u".to_string());
    let copy_enable = env::var("COPY_ENABLE")?.parse::<bool>().unwrap_or(false);
    let copy_key = env::var("COPY_KEY").unwrap_or("ctrl+shift+z".to_string());
    let docx_enable = env::var("DOCX_ENABLE")?.parse::<bool>().unwrap_or(false);
    let docx_key = env::var("DOCX_KEY").unwrap_or("ctrl+shift+x".to_string());
    let inspector = env::var("INSPECTOR").unwrap_or("".to_string());
    let signature_width = env::var("SIGNATURE_WIDTH")?.parse::<f32>().unwrap_or(5.58);
    let signature_height = env::var("SIGNATURE_HEIGHT")?.parse::<f32>().unwrap_or(1.73);
    Ok(HotkeyConfig {
        doc_enable,
        doc_key,
        upload_enable,
        upload_key,
        copy_enable,
        copy_key,
        docx_enable,
        docx_key,
        inspector,
        signature_width,
        signature_height,
    })
}
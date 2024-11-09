mod handle;
mod menu;
mod utils;
mod logger;
mod ziafp;
mod command;

use std::env;
use serde::Serialize;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_autostart::MacosLauncher;

use crate::handle::handle_setup;
use crate::ziafp::run as ziafp_run;
use crate::command::get_login_status;


#[derive(Serialize, Clone)]
struct Link {
    link: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    tauri::async_runtime::spawn(async move {
        let current_exe = std::env::current_exe().expect("无法获取当前执行文件路径");
        dotenv::from_path(format!(
            "{}/local.env",
            current_exe.parent().unwrap().to_str().unwrap()
        ))
        .ok();
        let base_url = env::var("BASE_URL").expect("Error reading BASE_URL");
        let username = env::var("USER_NAME").expect("Error reading USER_NAME");
        let password = env::var("PASSWORD").expect("Error reading PASSWORD");
        let port = env::var("PORT").unwrap_or_else(|_| "25455".to_string());
        let debug = env::var("DEBUG").unwrap_or_else(|_| "false".to_string());
        let log_enabled = env::var("LOG_ENABLED").unwrap_or_else(|_| "false".to_string());
        let _ = ziafp_run(base_url, username, password, port, debug, log_enabled).await;
    });
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            handle_setup(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_login_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

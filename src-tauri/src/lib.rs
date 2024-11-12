mod command;
mod config;
mod handle;
mod listen_manager;
mod logger;
mod menu;
mod server_manager;
mod utils;
mod ziafp;
use serde::Serialize;
use std::env;
use tauri::Manager;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_autostart::MacosLauncher;

use crate::command as cmd;
use crate::handle::handle_setup;
use crate::listen_manager::ListenManager;
use crate::server_manager::ServerManager;

#[derive(Serialize, Clone)]
struct Link {
    link: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            handle_setup(app);
            let server_manager = ServerManager::new(app.handle().clone());
            app.manage(server_manager);
            let listen_manager = ListenManager::new(app.handle().clone());
            app.manage(listen_manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::get_login_status,
            cmd::get_server_config,
            cmd::save_server_config,
            cmd::reload_config,
            cmd::restart_server,
            cmd::stop_server,
            cmd::get_base_config,
            cmd::save_base_config,
            cmd::get_server_logs,
            cmd::get_hotkey_config,
            cmd::save_hotkey_config,
            cmd::start_hotkey_listener,
            cmd::stop_hotkey_listener,
            cmd::restart_hotkey_listener,
            cmd::reload_hotkey_listener,
            cmd::is_listening,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

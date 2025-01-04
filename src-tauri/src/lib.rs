mod command;
mod config;
mod handle;
mod listen_manager;
mod menu;
mod server_manager;
mod utils;
mod ziafp;
mod yolov8;
mod pdf;
mod blake2;
mod apply;

use blake2::handle_drag_drop_event;
use serde::Serialize;
use std::env;
use tauri::{DragDropEvent, WindowEvent};
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_autostart::MacosLauncher;

use crate::command as cmd;
use crate::handle::handle_setup;

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
            apply::apply(app);
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) => {
                handle_drag_drop_event(window, &paths);
            }
            _ => {}
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
            cmd::open_local_dir,
            cmd::open_with_wps,
            cmd::write_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod apply;
mod blake2;
mod command;
mod handle;
mod menu;
mod pdf_extract;
mod server_manager;
mod utils;

use blake2::{handle_drag_drop_event, DRAG_TO_BLAKE2};
use pdf_extract::handle_pdf_parse_event;
use serde::Serialize;
use std::env;
use tauri::{DragDropEvent, WindowEvent};
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
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
                let app = window.app_handle();
                println!("{:?}", paths.clone());
                if DRAG_TO_BLAKE2.load(std::sync::atomic::Ordering::Relaxed) {
                    handle_drag_drop_event(app, &paths);
                } else {
                    handle_pdf_parse_event(app, &paths);
                }
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
            cmd::minimize_window,
            cmd::hide_window,
            cmd::switch_drag_to_blake2,
            cmd::get_llm_config,
            cmd::save_llm_config,
            cmd::reload_llm_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

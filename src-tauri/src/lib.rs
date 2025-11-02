mod apply;
mod command;
mod handle;
mod menu;
mod utils;

use serde::Serialize;
use std::env;
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
        .invoke_handler(tauri::generate_handler![
            cmd::get_login_status,
            cmd::get_config,
            cmd::save_config,
            cmd::reload_config,
            cmd::get_server_logs,
            cmd::is_listening,
            cmd::open_local_dir,
            cmd::open_with_wps,
            cmd::write_log,
            cmd::minimize_window,
            cmd::maximize_window,
            cmd::unmaximize_window,
            cmd::hide_window,
            cmd::get_summary_info_by_buffer,
            cmd::get_report_summary_by_buffer,
            cmd::search_file,
            cmd::search_property,
            cmd::set_clipboard_text,
            cmd::get_clipboard_snapshot_configs,
            cmd::add_clipboard_snapshot_config,
            cmd::remove_clipboard_snapshot_config,
            cmd::reload_clipboard_snapshot_configs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

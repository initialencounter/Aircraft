use serde::Serialize;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_autostart::MacosLauncher;

use crate::handle::handle_setup;

mod handle;
mod menu;
mod utils;

#[derive(Serialize, Clone)]
struct Link {
    link: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

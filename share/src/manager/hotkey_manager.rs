use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use crate::hotkey_handler::copy::copy_file_to_here;
use crate::hotkey_handler::copy_to_clipboard::set_image_to_clipboard;
use crate::hotkey_handler::upload::upload_file;
use crate::types::HotkeyConfig;
use flextrek::{listen, listen_path, listen_selected_files, HotkeyHandle};

pub struct HotkeyManager {
    is_running: AtomicBool,
    copy_handle: Mutex<Option<HotkeyHandle>>,
    upload_handle: Mutex<Option<HotkeyHandle>>,
    key_proxy_handle: Mutex<Option<HotkeyHandle>>,
    pub config: Mutex<HotkeyConfig>,
    custom_hotkey_handle: Mutex<Option<Vec<HotkeyHandle>>>,
}

impl HotkeyManager {
    pub fn new(config: HotkeyConfig) -> Self {
        Self {
            is_running: AtomicBool::new(true),
            copy_handle: Mutex::new(None),
            upload_handle: Mutex::new(None),
            config: Mutex::new(config),
            key_proxy_handle: Mutex::new(None),
            custom_hotkey_handle: Mutex::new(None),
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        *self.key_proxy_handle.lock().unwrap() =
            Some(listen("ctrl+shift+a".to_string(), move || async move {
                set_image_to_clipboard().unwrap();
            }));
        if config.copy_enable {
            *self.copy_handle.lock().unwrap() =
                Some(listen_path(config.copy_key, |paths| async move {
                    copy_file_to_here(paths.to_str().unwrap().to_string()).await;
                }))
        }
        if config.upload_enable {
            *self.upload_handle.lock().unwrap() = Some(listen_selected_files(
                config.upload_key,
                |paths| async move {
                    upload_file(paths.to_vec()).await;
                },
            ));
        }
        *self.custom_hotkey_handle.lock().unwrap() = None; // 清空所有句柄
        for hotkey in config.custom_hotkey {
            let handle = listen(hotkey.hotkey, move || {
                let cmd = hotkey.cmd.clone();
                async move {
                    let _ = std::process::Command::new(&cmd).spawn();
                }
            });
            let mut handle_list = vec![handle];
            if let Some(handle) = self.custom_hotkey_handle.lock().unwrap().take() {
                handle_list.extend(handle);
            }
            *self.custom_hotkey_handle.lock().unwrap() = Some(handle_list);
        }
        self.is_running
            .store(true, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn stop(&self) {
        self.key_proxy_handle
            .lock()
            .unwrap()
            .take()
            .unwrap()
            .unregister();
        if let Some(handle) = self.copy_handle.lock().unwrap().take() {
            handle.unregister();
        }
        if let Some(handle) = self.upload_handle.lock().unwrap().take() {
            handle.unregister();
        }
        if let Some(custom_hotkey_handle) = self.custom_hotkey_handle.lock().unwrap().take() {
            for handle in custom_hotkey_handle {
                handle.unregister();
            }
        }
        self.is_running
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn save_config(&self, config: HotkeyConfig) {
        *self.config.lock().unwrap() = config;
    }

    pub fn is_listening(&self) -> bool {
        self.is_running.load(std::sync::atomic::Ordering::Relaxed)
    }
}

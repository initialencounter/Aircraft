use std::sync::atomic::AtomicBool;
use std::sync::mpsc::Sender;
use std::sync::Mutex;

use crate::hotkey_handler::copy::copy_file_to_here;
use crate::hotkey_handler::copy2::copy2_callback;
use crate::hotkey_handler::upload::upload_file;
use aircraft_types::config::HotkeyConfig;
use aircraft_types::logger::LogMessage;
use chrono::Local;
use flextrek::{listen, listen_path, listen_selected_files, HotkeyHandle};

pub struct HotkeyManager {
    is_running: AtomicBool,
    copy_handle: Mutex<Option<HotkeyHandle>>,
    upload_handle: Mutex<Option<HotkeyHandle>>,
    pub search_handle: Mutex<Option<HotkeyHandle>>,
    pub copy_handle2: Mutex<Option<HotkeyHandle>>,
    pub config: Mutex<HotkeyConfig>,
    custom_hotkey_handle: Mutex<Option<Vec<HotkeyHandle>>>,
    log_tx: Sender<LogMessage>,
}

impl HotkeyManager {
    pub fn new(config: HotkeyConfig, log_tx: Sender<LogMessage>) -> Self {
        Self {
            is_running: AtomicBool::new(true),
            copy_handle: Mutex::new(None),
            upload_handle: Mutex::new(None),
            config: Mutex::new(config),
            search_handle: Mutex::new(None),
            copy_handle2: Mutex::new(None),
            custom_hotkey_handle: Mutex::new(None),
            log_tx,
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        let log_tx = &self.log_tx;

        // 注册搜索热键 (CTRL+NUMPADSUBTRACT)
        let search_log_tx = log_tx.clone();
        *self.search_handle.lock().unwrap() =
            Some(listen("CTRL+NUMPADSUBTRACT".to_string(), move || {
                let log_tx = search_log_tx.clone();
                async move {
                    let search_text = clipboard_win::get_clipboard_string().unwrap_or_default();
                    let program = r"Everything64";
                    if let Err(e) = std::process::Command::new(program)
                        .arg("-s")
                        .arg(&search_text)
                        .spawn()
                    {
                        let current_time = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                        let _ = log_tx.send(LogMessage {
                            time_stamp: current_time,
                            level: "ERROR".to_string(),
                            message: format!("Failed to launch {}: {}", program, e),
                        });
                    }
                }
            }));

        // 注册 Copy2 热键 (CTRL+SHIFT+X)
        let copy2_log_tx = log_tx.clone();
        *self.copy_handle2.lock().unwrap() = Some(listen("CTRL+SHIFT+X".to_string(), move || {
            let log_tx = copy2_log_tx.clone();
            async move {
                if let Err(e) = copy2_callback() {
                    let current_time = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                    let _ = log_tx.send(LogMessage {
                        time_stamp: current_time,
                        level: "ERROR".to_string(),
                        message: format!("Copy2 热键执行失败: {}", e),
                    });
                }
            }
        }));

        // 注册文件复制热键
        if config.copy_enable {
            *self.copy_handle.lock().unwrap() =
                Some(listen_path(config.copy_key, |paths| async move {
                    copy_file_to_here(paths.to_str().unwrap().to_string()).await;
                }))
        }

        // 注册文件上传热键
        if config.upload_enable {
            *self.upload_handle.lock().unwrap() = Some(listen_selected_files(
                config.upload_key,
                |paths| async move {
                    upload_file(paths.to_vec()).await;
                },
            ));
        }

        // 清空并注册自定义热键
        let mut custom_handles = Vec::new();
        for hotkey in config.custom_hotkey {
            let cmd = hotkey.cmd.clone();
            let handle = listen(hotkey.hotkey, move || {
                let cmd = cmd.clone();
                async move {
                    let _ = std::process::Command::new(&cmd).spawn();
                }
            });
            custom_handles.push(handle);
        }
        *self.custom_hotkey_handle.lock().unwrap() = Some(custom_handles);

        self.is_running
            .store(true, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn stop(&self) {
        // 注销搜索热键
        if let Some(handle) = self.search_handle.lock().unwrap().take() {
            handle.unregister();
        }

        // 注销 Copy2 热键
        if let Some(handle) = self.copy_handle2.lock().unwrap().take() {
            handle.unregister();
        }

        // 注销文件复制热键
        if let Some(handle) = self.copy_handle.lock().unwrap().take() {
            handle.unregister();
        }

        // 注销文件上传热键
        if let Some(handle) = self.upload_handle.lock().unwrap().take() {
            handle.unregister();
        }

        // 注销所有自定义热键
        if let Some(custom_handles) = self.custom_hotkey_handle.lock().unwrap().take() {
            for handle in custom_handles {
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

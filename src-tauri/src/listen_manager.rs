use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use tauri::Wry;

use crate::command::get_hotkey_config;
use crate::config::HotkeyConfig;
use flextrek::{listen_path, listen_selected_files, HotkeyHandle};

pub struct ListenManager {
    is_running: AtomicBool,
    doc_handle: Mutex<Option<HotkeyHandle>>,
    copy_handle: Mutex<Option<HotkeyHandle>>,
    upload_handle: Mutex<Option<HotkeyHandle>>,
    docx_handle: Mutex<Option<HotkeyHandle>>,
    config: Mutex<HotkeyConfig>,
}

impl ListenManager {
    pub fn new(app_handle: tauri::AppHandle<Wry>) -> Self {
        let config = get_hotkey_config(app_handle.clone());
        let config_clone = config.clone();
        let doc_handle = if config.doc_enable {
            Some(listen_path(config.doc_key, move |path| async move {
                println!("doc path: {}", path.display());
            }))
        } else {
            None
        };
        let copy_handle = if config.copy_enable {
            Some(listen_selected_files(config.copy_key, |paths| async move {
                println!("copy paths: {}", paths.join(", "));
            }))
        } else {
            None
        };
        let upload_handle = if config.upload_enable {
            Some(listen_selected_files(
                config.upload_key,
                |paths| async move {
                    println!("upload paths: {}", paths.join(", "));
                },
            ))
        } else {
            None
        };
        let docx_handle = if config.docx_enable {
            Some(listen_path(config.docx_key, |path| async move {
                println!("docx path: {}", path.display());
            }))
        } else {
            None
        };
        println!("hotkey listener started");
        Self {
            is_running: AtomicBool::new(false),
            doc_handle: Mutex::new(doc_handle),
            copy_handle: Mutex::new(copy_handle),
            upload_handle: Mutex::new(upload_handle),
            docx_handle: Mutex::new(docx_handle),
            config: Mutex::new(config_clone),
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        if config.doc_enable {
            println!("doc enable: {}", config.doc_key.clone());
            *self.doc_handle.lock().unwrap() =
                Some(listen_path(config.doc_key, move |path| async move {
                    println!("doc path: {}", path.display());
                }));
        }
        if config.copy_enable {
            *self.copy_handle.lock().unwrap() =
                Some(listen_selected_files(config.copy_key, |paths| async move {
                    println!("copy paths: {}", paths.join(", "));
                }));
        }
        if config.upload_enable {
            *self.upload_handle.lock().unwrap() = Some(listen_selected_files(
                config.upload_key,
                |paths| async move {
                    println!("upload paths: {}", paths.join(", "));
                },
            ));
        }
        if config.docx_enable {
            *self.docx_handle.lock().unwrap() =
                Some(listen_path(config.docx_key, |path| async move {
                    println!("docx path: {}", path.display());
                }));
        }
        println!("hotkey listener started");
        self.is_running
            .store(true, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn stop(&self) {
        if let Some(handle) = self.doc_handle.lock().unwrap().take() {
            handle.unregister();
        }
        if let Some(handle) = self.copy_handle.lock().unwrap().take() {
            handle.unregister();
        }
        if let Some(handle) = self.upload_handle.lock().unwrap().take() {
            handle.unregister();
        }
        if let Some(handle) = self.docx_handle.lock().unwrap().take() {
            handle.unregister();
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

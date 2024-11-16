use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use tauri::Wry;

use crate::config::HotkeyConfig;
use crate::hotkey::{copy_file_to_here, upload_file, write_doc};
use crate::{command::get_hotkey_config, hotkey::replace_docx};
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
                let _ = write_doc(path.to_str().unwrap().to_string()).await;
            }))
        } else {
            None
        };
        let copy_handle = if config.copy_enable {
            Some(listen_path(config.copy_key, |paths| async move {
                copy_file_to_here(paths.to_str().unwrap().to_string()).await;
            }))
        } else {
            None
        };
        let upload_handle = if config.upload_enable {
            Some(listen_selected_files(
                config.upload_key,
                |paths| async move {
                    upload_file(paths.to_vec()).await;
                },
            ))
        } else {
            None
        };
        let docx_handle = if config.docx_enable {
            Some(listen_path(config.docx_key, |path| async move {
                let _ = replace_docx(path.to_str().unwrap().to_string()).await;
            }))
        } else {
            None
        };
        Self {
            is_running: AtomicBool::new(true),
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
            *self.doc_handle.lock().unwrap() =
                Some(listen_path(config.doc_key, move |path| async move {
                    let _ = write_doc(path.to_str().unwrap().to_string()).await;
                }));
        }
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
        if config.docx_enable {
            *self.docx_handle.lock().unwrap() =
                Some(listen_path(config.docx_key, |path| async move {
                    let _ = replace_docx(path.to_str().unwrap().to_string()).await;
                }));
        }
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

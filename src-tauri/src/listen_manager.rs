use enigo::{Direction::Click, Enigo, Key, Keyboard, Settings};
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use tauri::Wry;

use crate::command::get_hotkey_config;
use crate::config::HotkeyConfig;
use flextrek::{listen_path, listen_selected_files, HotkeyHandle};
use share::hotkey_handler::{copy_file_to_here, replace_docx, upload_file, write_doc};

pub struct ListenManager {
    is_running: AtomicBool,
    doc_handle: Mutex<Option<HotkeyHandle>>,
    copy_handle: Mutex<Option<HotkeyHandle>>,
    upload_handle: Mutex<Option<HotkeyHandle>>,
    docx_handle: Mutex<Option<HotkeyHandle>>,
    key_proxy_handle: Mutex<Option<HotkeyHandle>>,
    config: Mutex<HotkeyConfig>,
}


fn simulate_f2_press() {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    enigo.key(Key::F2, Click).unwrap();
}

impl ListenManager {
    pub fn new(app_handle: tauri::AppHandle<Wry>) -> Self {
        let config = get_hotkey_config(app_handle.clone());
        let config_clone = config.clone();
        let key_proxy_handle = Some(listen_path(
            "ctrl+shift+a".to_string(),
            move |_path| async move {
                simulate_f2_press();
            },
        ));
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
            let inspector_clone = config.inspector.clone();
            Some(listen_path(config.docx_key, move |path| {
                let inspector = inspector_clone.clone();
                async move {
                    let _ = replace_docx(
                        path.to_str().unwrap().to_string(),
                        &inspector,
                        config.signature_width,
                        config.signature_height,
                    )
                    .await;
                }
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
            key_proxy_handle: Mutex::new(key_proxy_handle),
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        *self.key_proxy_handle.lock().unwrap() = Some(listen_path(
            "ctrl+shift+a".to_string(),
            move |_path| async move {
                simulate_f2_press();
            },
        ));
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
            let inspector_clone = config.inspector.clone();
            *self.docx_handle.lock().unwrap() = Some(listen_path(config.docx_key, move |path| {
                let inspector = inspector_clone.clone();
                async move {
                    let _ = replace_docx(
                        path.to_str().unwrap().to_string(),
                        &inspector,
                        config.signature_width,
                        config.signature_height,
                    )
                    .await;
                }
            }));
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

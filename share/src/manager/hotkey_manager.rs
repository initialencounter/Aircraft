use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use crate::hotkey_handler::{copy_file_to_here, replace_docx, set_image_to_clipboard, upload_file, write_doc};
use crate::types::HotkeyConfig;
use flextrek::{listen_path, listen_selected_files, HotkeyHandle, listen};

pub struct HotkeyManager {
    is_running: AtomicBool,
    doc_handle: Mutex<Option<HotkeyHandle>>,
    copy_handle: Mutex<Option<HotkeyHandle>>,
    upload_handle: Mutex<Option<HotkeyHandle>>,
    docx_handle: Mutex<Option<HotkeyHandle>>,
    key_proxy_handle: Mutex<Option<HotkeyHandle>>,
    config: Mutex<HotkeyConfig>,
}


impl HotkeyManager {
    pub fn new(config: HotkeyConfig) -> Self {
        Self {
            is_running: AtomicBool::new(true),
            doc_handle: Mutex::new(None),
            copy_handle: Mutex::new(None),
            upload_handle: Mutex::new(None),
            docx_handle: Mutex::new(None),
            config: Mutex::new(config),
            key_proxy_handle: Mutex::new(None),
        }
    }

    pub fn start(&self) {
        let config = self.config.lock().unwrap().clone();
        *self.key_proxy_handle.lock().unwrap() = Some(listen(
            "ctrl+shift+a".to_string(),
            move || async move {
                set_image_to_clipboard().unwrap();
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
                        config.signature_width as f32 / 100.0,
                        config.signature_height as f32 /100.0,
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

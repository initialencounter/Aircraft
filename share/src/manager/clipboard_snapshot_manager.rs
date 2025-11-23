use clipkeeper::{
    get_clipkeeper_data_path, get_windows_clipboard_snapshot, restore_windows_clipboard_snapshot,
    WindowsClipboardSnapshot,
};
use flextrek::{listen, HotkeyHandle};
use std::{fs, sync::Mutex};

use aircraft_types::others::ClipboardHotkey;

pub struct ClipboardSnapshotManager {
    pub handles: Mutex<Option<Vec<HotkeyHandle>>>,
}

impl ClipboardSnapshotManager {
    pub fn new() -> Self {
        Self {
            handles: Mutex::new(None),
        }
    }

    pub fn start(&self) {
        let configs = get_clipboard_snapshot_configs();
        let mut hotkey_handles = vec![];
        for config in configs {
            for hotkey in config.hotkeys {
                let content_name = config.clipboard_content_name.clone();
                let handle = listen(hotkey, move || {
                    let content_name = content_name.clone();
                    async move {
                        let config_dir = get_clipkeeper_data_path().join(&content_name);
                        let snapshot_file = config_dir.join("clipboard_snapshot.json");
                        if let Ok(snapshot) =
                            WindowsClipboardSnapshot::load_from_file(Some(snapshot_file))
                        {
                            if let Err(e) = restore_windows_clipboard_snapshot(&snapshot) {
                                eprintln!("恢复剪贴板失败: {:?}", e);
                            }
                        } else {
                            eprintln!(
                                "未找到剪贴板快照文件: {:?}",
                                config_dir.join("clipboard_snapshot.json")
                            );
                        }
                    }
                });
                hotkey_handles.push(handle);
            }
        }
        *self.handles.lock().unwrap() = Some(hotkey_handles);
    }

    pub fn stop(&self) {
        for handle in self.handles.lock().unwrap().take().unwrap_or_default() {
            handle.unregister();
        }
    }
}

pub fn get_clipboard_snapshot_configs() -> Vec<ClipboardHotkey> {
    let data_dir = get_clipkeeper_data_path();
    if !data_dir.exists() {
        return vec![];
    }
    let mut configs = vec![];
    for entry in fs::read_dir(data_dir).unwrap() {
        let entry_path = entry.unwrap().path();
        if entry_path.is_file() {
            continue;
        }
        let folder_name = entry_path.file_name().unwrap().to_str().unwrap();
        let hotkey_file = entry_path.join("hotkey_config.json");
        let snapshot_file = entry_path.join("clipboard_snapshot.json");

        if !(hotkey_file.exists() && snapshot_file.exists()) {
            continue;
        }
        let config_json = fs::read_to_string(hotkey_file).unwrap();
        let hotkeys: Vec<String> = serde_json::from_str(&config_json).unwrap_or_default();
        configs.push(ClipboardHotkey {
            hotkeys,
            clipboard_content_name: folder_name.to_string(),
        });
    }
    configs
}

pub fn add_clipboard_snapshot_config(
    config: ClipboardHotkey,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config_dir = get_clipkeeper_data_path().join(&config.clipboard_content_name);
    if config_dir.exists() {
        return Err("已存在同名剪贴板快照配置，请更换名称后重试。".into());
    }
    fs::create_dir_all(&config_dir)?;
    let snapshot = get_windows_clipboard_snapshot().unwrap();
    let snapshot_file = config_dir.join("clipboard_snapshot.json");
    let _ = snapshot.save_to_file(Some(snapshot_file)).unwrap();
    let hotkey_file = config_dir.join("hotkey_config.json");
    let config_json = serde_json::to_string_pretty(&config.hotkeys)?;
    fs::write(hotkey_file, config_json)?;
    Ok(())
}

pub fn remove_clipboard_snapshot_config(
    content_name: &str,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config_dir = get_clipkeeper_data_path().join(content_name);
    if !config_dir.exists() {
        return Err("未找到对应的剪贴板快照配置。".into());
    }
    fs::remove_dir_all(config_dir)?;
    Ok(())
}

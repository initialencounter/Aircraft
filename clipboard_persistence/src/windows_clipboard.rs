use anyhow::Result;
use serde::{Deserialize, Serialize};

#[cfg(windows)]
use windows::Win32::{
    Foundation::HWND,
    System::{
        DataExchange::{
            CloseClipboard, EmptyClipboard, EnumClipboardFormats, GetClipboardData,
            GetClipboardFormatNameW, OpenClipboard, RegisterClipboardFormatW, SetClipboardData,
        },
        Memory::{GlobalAlloc, GlobalLock, GlobalSize, GlobalUnlock, GMEM_MOVEABLE},
    },
};

#[cfg(windows)]
use windows::Win32::Foundation::HGLOBAL;

/// Windows 剪贴板格式数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsClipboardFormat {
    /// 格式 ID
    pub format_id: u32,
    /// 格式名称（如果是自定义格式）
    pub format_name: Option<String>,
    /// 格式数据（Base64 编码）
    #[serde(with = "base64_serde")]
    pub data: Vec<u8>,
}

/// Windows 剪贴板完整快照
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsClipboardSnapshot {
    pub formats: Vec<WindowsClipboardFormat>,
}

impl WindowsClipboardSnapshot {
    /// 保存快照到文件（默认路径为当前目录下的 clipboard_snapshot.json）
    pub fn save_to_file(&self, path: Option<std::path::PathBuf>) -> Result<std::path::PathBuf> {
        let file_path = match path {
            Some(p) => p,
            None => std::path::PathBuf::from("clipboard_snapshot.json"),
        };

        let json_data = serde_json::to_string_pretty(self)?;
        std::fs::write(&file_path, json_data)?;

        Ok(file_path)
    }

    /// 从文件加载快照（默认路径为当前目录下的 clipboard_snapshot.json）
    pub fn load_from_file(path: Option<std::path::PathBuf>) -> Result<WindowsClipboardSnapshot> {
        let file_path = match path {
            Some(p) => p,
            None => std::path::PathBuf::from("clipboard_snapshot.json"),
        };

        let json_data = std::fs::read_to_string(&file_path)?;
        let snapshot: WindowsClipboardSnapshot = serde_json::from_str(&json_data)?;

        Ok(snapshot)
    }
}

mod base64_serde {
    use base64::{engine::general_purpose, Engine as _};
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let encoded = general_purpose::STANDARD.encode(bytes);
        encoded.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let encoded: String = String::deserialize(deserializer)?;
        general_purpose::STANDARD
            .decode(&encoded)
            .map_err(serde::de::Error::custom)
    }
}

#[cfg(windows)]
/// 获取剪贴板格式的名称
unsafe fn get_format_name(format_id: u32) -> Option<String> {
    // 标准格式不需要获取名称
    if format_id < 0xC000 {
        return None;
    }

    let mut buffer = vec![0u16; 256];
    let len = unsafe { GetClipboardFormatNameW(format_id, &mut buffer) };
    
    if len > 0 {
        let name = String::from_utf16_lossy(&buffer[..len as usize]);
        Some(name)
    } else {
        None
    }
}

#[cfg(windows)]
/// 注册或获取剪贴板格式 ID
unsafe fn register_format(format_name: &str) -> u32 {
    let wide_name: Vec<u16> = format_name.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe { RegisterClipboardFormatW(windows::core::PCWSTR(wide_name.as_ptr())) }
}

#[cfg(windows)]
/// 从全局内存句柄读取数据
unsafe fn read_global_data(handle: HGLOBAL) -> Result<Vec<u8>> {
    unsafe {
        let size = GlobalSize(handle);
        if size == 0 {
            return Ok(Vec::new());
        }

        let ptr = GlobalLock(handle);
        if ptr.is_null() {
            anyhow::bail!("无法锁定全局内存");
        }

        let data = std::slice::from_raw_parts(ptr as *const u8, size).to_vec();
        let _ = GlobalUnlock(handle);

        Ok(data)
    }
}

#[cfg(windows)]
/// 将数据写入全局内存句柄
unsafe fn write_global_data(data: &[u8]) -> Result<HGLOBAL> {
    unsafe {
        let handle = GlobalAlloc(GMEM_MOVEABLE, data.len())?;
        if handle.0.is_null() {
            anyhow::bail!("无法分配全局内存");
        }

        let ptr = GlobalLock(handle);
        if ptr.is_null() {
            // Note: GlobalFree is not needed as ownership is transferred to clipboard
            anyhow::bail!("无法锁定全局内存");
        }

        std::ptr::copy_nonoverlapping(data.as_ptr(), ptr as *mut u8, data.len());
        let _ = GlobalUnlock(handle);

        Ok(handle)
    }
}

#[cfg(windows)]
/// 获取当前剪贴板的所有格式和数据（完整快照）
pub fn get_windows_clipboard_snapshot() -> Result<WindowsClipboardSnapshot> {
    unsafe {
        // 打开剪贴板
        OpenClipboard(HWND::default())?;

        let mut formats = Vec::new();
        let mut current_format = 0u32;

        // 枚举所有剪贴板格式
        loop {
            current_format = EnumClipboardFormats(current_format);
            if current_format == 0 {
                break;
            }

            // 获取格式数据
            match GetClipboardData(current_format) {
                Ok(handle_value) => {
                    // 将 HANDLE 转换为 HGLOBAL
                    let hglobal = HGLOBAL(handle_value.0);
                    // 读取数据
                    match read_global_data(hglobal) {
                        Ok(data) => {
                            let format_name = get_format_name(current_format);
                            
                            formats.push(WindowsClipboardFormat {
                                format_id: current_format,
                                format_name,
                                data,
                            });
                        }
                        Err(e) => {
                            eprintln!("警告: 读取格式 {} 数据失败: {}", current_format, e);
                        }
                    }
                }
                Err(_) => {
                    eprintln!("警告: 无法获取格式 {} 的数据", current_format);
                }
            }
        }

        let _ = CloseClipboard();

        Ok(WindowsClipboardSnapshot { formats })
    }
}

#[cfg(windows)]
/// 恢复剪贴板到指定快照（完整恢复所有格式）
pub fn restore_windows_clipboard_snapshot(snapshot: &WindowsClipboardSnapshot) -> Result<()> {
    unsafe {
        // 打开剪贴板
        OpenClipboard(HWND::default())?;

        // 清空剪贴板
        if let Err(e) = EmptyClipboard() {
            let _ = CloseClipboard();
            anyhow::bail!("无法清空剪贴板: {}", e);
        }

        // 恢复所有格式
        for format in &snapshot.formats {
            // 如果是自定义格式，需要先注册
            let format_id = if let Some(ref name) = format.format_name {
                register_format(name)
            } else {
                format.format_id
            };

            // 写入数据
            match write_global_data(&format.data) {
                Ok(hglobal) => {
                    // 将 HGLOBAL 转换为 HANDLE
                    let handle_value = windows::Win32::Foundation::HANDLE(hglobal.0);
                    // SetClipboardData 接管内存所有权，不需要手动释放
                    if let Err(e) = SetClipboardData(format_id, handle_value) {
                        eprintln!("警告: 设置格式 {} 失败: {}", format_id, e);
                    }
                }
                Err(e) => {
                    eprintln!("警告: 分配格式 {} 的内存失败: {}", format_id, e);
                }
            }
        }

        let _ = CloseClipboard();
        Ok(())
    }
}

#[cfg(not(windows))]
pub fn get_windows_clipboard_snapshot() -> Result<WindowsClipboardSnapshot> {
    anyhow::bail!("Windows 剪贴板 API 仅在 Windows 平台可用");
}

#[cfg(not(windows))]
pub fn restore_windows_clipboard_snapshot(_snapshot: &WindowsClipboardSnapshot) -> Result<()> {
    anyhow::bail!("Windows 剪贴板 API 仅在 Windows 平台可用");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn test_snapshot_and_restore() {
        // 获取当前剪贴板快照
        let snapshot = get_windows_clipboard_snapshot().unwrap();
        println!("捕获了 {} 个格式", snapshot.formats.len());

        for format in &snapshot.formats {
            println!(
                "格式 ID: {}, 名称: {:?}, 数据大小: {} 字节",
                format.format_id,
                format.format_name,
                format.data.len()
            );
        }

        // 测试恢复
        restore_windows_clipboard_snapshot(&snapshot).unwrap();
        println!("恢复成功");
    }
}

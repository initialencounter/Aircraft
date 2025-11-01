#[cfg(windows)]
use clipboard_persistence::{get_windows_clipboard_snapshot, restore_windows_clipboard_snapshot, WindowsClipboardSnapshot};

fn main() {
    #[cfg(windows)]
    {
        println!("=== 测试 Windows 剪贴板完整持久化功能（保留所有格式） ===\n");
        test_windows_api();
        println!("\n\n");
    }
}

#[cfg(windows)]
fn test_windows_api() {
    // 步骤1: 获取当前剪贴板内容（所有格式）
    println!("1. 获取当前剪贴板内容（使用 Windows API - 捕获所有格式）");
    let snapshot = get_windows_clipboard_snapshot().unwrap();
    println!("   捕获了 {} 个格式:", snapshot.formats.len());
    for (i, format) in snapshot.formats.iter().enumerate() {
        println!(
            "   [{:2}] 格式 ID: {:5}, 名称: {:30}, 数据: {} 字节",
            i + 1,
            format.format_id,
            format.format_name.as_deref().unwrap_or("<标准格式>"),
            format.data.len()
        );
    }

    // 步骤2: 保存到文件
    println!("\n2. 保存 Windows 快照到文件");
    let file_path = snapshot.save_to_file(None).unwrap();
    println!("   已保存到: {:?}", file_path);
    println!("   文件大小: {} 字节", std::fs::metadata(&file_path).unwrap().len());

    // 步骤4: 从文件加载快照
    println!("\n4. 从文件加载 Windows 快照");
    let loaded_snapshot = WindowsClipboardSnapshot::load_from_file(None).unwrap();
    println!("   加载成功");
    println!("   格式数量: {}", loaded_snapshot.formats.len());

    // 步骤5: 恢复剪贴板（完整恢复所有格式）
    println!("\n5. 恢复剪贴板到快照状态（完整恢复所有格式）");
    restore_windows_clipboard_snapshot(&loaded_snapshot).unwrap();
    println!("   恢复成功");
}
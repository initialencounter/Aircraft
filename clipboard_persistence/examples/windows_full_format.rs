use anyhow::Result;
use clipboard_persistence::{
    get_windows_clipboard_snapshot, restore_windows_clipboard_snapshot,
    WindowsClipboardSnapshot,
};
use std::path::PathBuf;

fn main() -> Result<()> {
    println!("=== Windows 剪贴板完整格式保留示例 ===\n");
    println!("使用场景: 从 Word 复制带格式的内容，保存后完整恢复\n");

    // 1. 捕获当前剪贴板
    println!("步骤 1: 捕获当前剪贴板...");
    let snapshot = get_windows_clipboard_snapshot()?;
    
    println!("✓ 已捕获 {} 个格式:\n", snapshot.formats.len());
    for (i, format) in snapshot.formats.iter().enumerate() {
        let format_name = match format.format_id {
            1 => "CF_TEXT (ANSI 文本)".to_string(),
            2 => "CF_BITMAP (位图)".to_string(),
            7 => "CF_OEMTEXT (OEM 文本)".to_string(),
            13 => "CF_UNICODETEXT (Unicode 文本)".to_string(),
            16 => "CF_LOCALE (区域设置)".to_string(),
            _ => format
                .format_name
                .as_ref()
                .map(|n| n.clone())
                .unwrap_or_else(|| format!("格式 {}", format.format_id)),
        };

        println!(
            "  [{:2}] {:<40} - {:>8} 字节",
            i + 1,
            format_name,
            format.data.len()
        );
    }

    // 2. 保存到文件
    println!("\n步骤 2: 保存到文件...");
    let save_path = PathBuf::from("my_clipboard_backup.json");
    snapshot.save_to_file(Some(save_path.clone()))?;
    let file_size = std::fs::metadata(&save_path)?.len();
    println!(
        "✓ 已保存到: {:?} ({:.2} KB)",
        save_path,
        file_size as f64 / 1024.0
    );

    // 3. 提示用户修改剪贴板
    println!("\n步骤 3: 请修改剪贴板内容（例如复制其他内容）");
    println!("按 Enter 继续恢复剪贴板...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input)?;

    // 4. 从文件恢复
    println!("\n步骤 4: 从文件恢复剪贴板...");
    let loaded_snapshot = WindowsClipboardSnapshot::load_from_file(Some(save_path.clone()))?;
    restore_windows_clipboard_snapshot(&loaded_snapshot)?;
    println!("✓ 剪贴板已恢复，所有格式已完整恢复!");

    // 5. 验证
    println!("\n步骤 5: 验证恢复结果...");
    let restored_snapshot = get_windows_clipboard_snapshot()?;
    
    if restored_snapshot.formats.len() == snapshot.formats.len() {
        println!("✓ 格式数量匹配: {} 个", restored_snapshot.formats.len());
    } else {
        println!(
            "⚠ 格式数量不匹配: 原始 {} 个, 恢复 {} 个",
            snapshot.formats.len(),
            restored_snapshot.formats.len()
        );
    }

    // 检查每个格式的数据大小
    let mut all_match = true;
    for (i, (orig, rest)) in snapshot
        .formats
        .iter()
        .zip(restored_snapshot.formats.iter())
        .enumerate()
    {
        if orig.data.len() != rest.data.len() {
            println!(
                "  ⚠ 格式 {} 数据大小不匹配: {} vs {} 字节",
                i + 1,
                orig.data.len(),
                rest.data.len()
            );
            all_match = false;
        }
    }

    if all_match {
        println!("✓ 所有格式数据大小匹配");
    }

    println!("\n🎉 完成！现在您可以将剪贴板内容粘贴到 Word 等应用，");
    println!("   格式应该与原始复制时完全一致。");

    // 清理
    if save_path.exists() {
        std::fs::remove_file(&save_path)?;
        println!("\n(已清理临时文件: {:?})", save_path);
    }

    Ok(())
}

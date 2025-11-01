# Windows 剪贴板完整持久化 API 使用说明

## 概述

本模块提供了两种剪贴板持久化方案：

1. **标准方案** (`ClipboardSnapshot`): 使用 `clipboard-rs` 库，支持跨平台，但在恢复 Word 等复杂格式时可能丢失部分格式信息。

2. **Windows API 方案** (`WindowsClipboardSnapshot`): 直接使用 Windows API，**绝对保留所有原格式**，包括 Word docx 的所有内部格式。

## Windows API 方案的优势

### 完整格式保留
- 捕获剪贴板中的**所有格式**（包括自定义格式）
- 保留 Word 文档的所有内部格式标记
- 支持复杂的 OLE 对象和嵌入式内容
- 无损恢复，字节级精确

### 支持的格式示例
当从 Word 复制内容时，Windows 剪贴板可能包含以下格式：
- `CF_UNICODETEXT` - Unicode 文本
- `CF_TEXT` - ANSI 文本
- `Rich Text Format` - RTF 格式
- `HTML Format` - HTML 格式
- `XML Spreadsheet` - Office XML 格式
- `Embed Source` - OLE 嵌入源
- `Object Descriptor` - OLE 对象描述符
- `Native` - 应用程序原生格式
- 以及其他自定义格式...

## 使用方法

### 1. 捕获剪贴板快照

```rust
use clipboard_persistence::{get_windows_clipboard_snapshot, WindowsClipboardSnapshot};

// 获取当前剪贴板的完整快照（所有格式）
let snapshot = get_windows_clipboard_snapshot()?;

println!("捕获了 {} 个格式", snapshot.formats.len());
for format in &snapshot.formats {
    println!(
        "格式 ID: {}, 名称: {:?}, 数据大小: {} 字节",
        format.format_id,
        format.format_name,
        format.data.len()
    );
}
```

### 2. 保存快照到文件

```rust
// 保存到默认位置 (程序目录/windows_clipboard_snapshot.json)
let file_path = snapshot.save_to_file(None)?;
println!("已保存到: {:?}", file_path);

// 或保存到指定路径
use std::path::PathBuf;
let custom_path = PathBuf::from("C:/my_snapshots/clipboard.json");
snapshot.save_to_file(Some(custom_path))?;
```

### 3. 从文件加载快照

```rust
// 从默认位置加载
let loaded_snapshot = WindowsClipboardSnapshot::load_from_file(None)?;

// 或从指定路径加载
let custom_path = PathBuf::from("C:/my_snapshots/clipboard.json");
let loaded_snapshot = WindowsClipboardSnapshot::load_from_file(Some(custom_path))?;
```

### 4. 恢复剪贴板

```rust
use clipboard_persistence::restore_windows_clipboard_snapshot;

// 完整恢复所有格式到剪贴板
restore_windows_clipboard_snapshot(&loaded_snapshot)?;
println!("剪贴板已恢复，所有格式已保留");
```

### 5. 完整示例

```rust
use clipboard_persistence::{
    get_windows_clipboard_snapshot,
    restore_windows_clipboard_snapshot,
    WindowsClipboardSnapshot,
};

fn main() -> anyhow::Result<()> {
    // 1. 从 Word 复制一段带格式的内容
    println!("请从 Word 复制一段内容...");
    std::thread::sleep(std::time::Duration::from_secs(3));

    // 2. 捕获快照
    println!("捕获剪贴板...");
    let snapshot = get_windows_clipboard_snapshot()?;
    println!("捕获了 {} 个格式", snapshot.formats.len());

    // 3. 保存到文件
    println!("保存快照...");
    let file_path = snapshot.save_to_file(None)?;
    println!("已保存到: {:?}", file_path);

    // 4. 清空剪贴板（模拟剪贴板被修改）
    println!("修改剪贴板内容...");
    use clipboard_rs::{Clipboard, ClipboardContext};
    let ctx = ClipboardContext::new()?;
    ctx.set_text("临时内容".to_string())?;

    // 5. 恢复快照
    println!("恢复剪贴板...");
    let loaded_snapshot = WindowsClipboardSnapshot::load_from_file(None)?;
    restore_windows_clipboard_snapshot(&loaded_snapshot)?;
    
    println!("✓ 完成！现在可以粘贴到 Word，格式应该完全保留");
    
    Ok(())
}
```

## 数据结构

### `WindowsClipboardFormat`

表示单个剪贴板格式：

```rust
pub struct WindowsClipboardFormat {
    /// 格式 ID (例如: 1 = CF_TEXT, 13 = CF_UNICODETEXT, 49408+ = 自定义格式)
    pub format_id: u32,
    
    /// 格式名称 (仅自定义格式有此字段)
    pub format_name: Option<String>,
    
    /// 格式数据 (Base64 编码保存到 JSON)
    pub data: Vec<u8>,
}
```

### `WindowsClipboardSnapshot`

完整的剪贴板快照：

```rust
pub struct WindowsClipboardSnapshot {
    /// 所有格式的列表
    pub formats: Vec<WindowsClipboardFormat>,
}
```

## 标准格式 ID 参考

| ID | 名称 | 说明 |
|----|------|------|
| 1 | CF_TEXT | ANSI 文本 |
| 2 | CF_BITMAP | 位图 |
| 3 | CF_METAFILEPICT | 元文件图片 |
| 7 | CF_OEMTEXT | OEM 文本 |
| 8 | CF_DIB | 设备独立位图 |
| 13 | CF_UNICODETEXT | Unicode 文本 |
| 14 | CF_ENHMETAFILE | 增强型元文件 |
| 15 | CF_HDROP | 文件列表 |
| 16 | CF_LOCALE | 区域设置 |
| 17 | CF_DIBV5 | DIB v5 |
| 49408+ | 自定义格式 | 应用程序注册的格式 |

## 技术细节

### 实现原理

1. **捕获**: 使用 `EnumClipboardFormats` 枚举所有格式，`GetClipboardData` 获取每个格式的数据
2. **保存**: 将所有格式的数据序列化为 JSON (二进制数据使用 Base64 编码)
3. **恢复**: 使用 `SetClipboardData` 逐个恢复所有格式到剪贴板

### 内存管理

- 使用 `GlobalAlloc` / `GlobalFree` 管理剪贴板数据的内存
- 使用 `GlobalLock` / `GlobalUnlock` 访问全局内存
- 设置剪贴板数据后，系统会接管内存所有权

### 线程安全

- 剪贴板操作需要在同一个线程中完成
- 每次操作前需要 `OpenClipboard`，操作后需要 `CloseClipboard`

## 注意事项

1. **仅限 Windows**: 此 API 仅在 Windows 平台可用
2. **权限**: 需要剪贴板访问权限
3. **文件大小**: 复杂格式（如 Word）的快照可能较大（几 MB）
4. **自定义格式**: 自动识别和保留所有自定义格式

## 测试

运行测试：

```bash
# 测试 Windows API 功能
cargo test test_windows_clipboard_persistence -- --nocapture

# 运行完整示例
cargo run --bin clipboard_persistence
```

## 与标准方案对比

| 特性 | 标准方案 | Windows API 方案 |
|------|---------|-----------------|
| 跨平台 | ✓ | ✗ (仅 Windows) |
| 文本格式 | ✓ | ✓ |
| HTML 格式 | ✓ | ✓ |
| RTF 格式 | ✓ | ✓ |
| 图片格式 | ✓ | ✓ |
| Word 完整格式 | ✗ (可能丢失) | ✓ (绝对保留) |
| 自定义格式 | 部分 | ✓ (全部) |
| OLE 对象 | ✗ | ✓ |
| 嵌入式内容 | ✗ | ✓ |

## 推荐使用场景

**使用 Windows API 方案**：
- 需要绝对保留 Word/Excel 等 Office 文档格式
- 处理复杂的剪贴板内容
- Windows 专用应用程序
- 需要 100% 精确恢复

**使用标准方案**：
- 需要跨平台支持
- 只处理简单的文本/HTML/图片格式
- 文件大小敏感
- 不需要完整格式保留

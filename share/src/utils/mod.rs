pub mod dialog;
pub mod fs;
pub mod uploader;

use chrono::Local;
use clipboard_rs::{Clipboard, ClipboardContext};
pub use dialog::*;
pub use fs::*;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn get_today_date() -> String {
    // 获取当前日期
    let today = Local::now().naive_local().date();

    // 格式化为 YYYY-MM-DD
    let formatted_date = today.format("%Y-%m-%d").to_string();
    formatted_date
}

pub fn parse_date(date_text: &str) -> Result<(String, String)> {
    let numbers: String = date_text.chars().filter(|c| c.is_digit(10)).collect();

    if numbers.len() < 8 {
        return Err("文件名称错误".into());
    }

    let year = &numbers[0..4];
    let month = &numbers[4..6];
    let day = &numbers[6..8];

    if month == "00" {
        Ok((format!("{}-01-01", year), format!("{}-12-31", year)))
    } else if day == "00" {
        Ok((
            format!("{}-{}-01", year, month),
            format!("{}-{}-31", year, month),
        ))
    } else {
        Ok((
            format!("{}-{}-{}", year, month, day),
            format!("{}-{}-{}", year, month, day),
        ))
    }
}

pub fn build_confirmation_message(raw_file_info: &[RawFileInfo]) -> String {
    let mut message = String::from("是否要上传这些文件?：\n");
    for (index, file) in raw_file_info.iter().enumerate() {
        message.push_str(&format!("{}. {}\n", index + 1, file.file_name));
    }
    message
}

pub fn set_clipboard_text(text: String) {
    match ClipboardContext::new() {
        Ok(ctx) => {
            if let Err(e) = ctx.set_text(text) {
                eprintln!("Failed to set clipboard text: {}", e);
            }
        }
        Err(e) => {
            eprintln!("Failed to create clipboard context: {}", e);
        }
    }
}

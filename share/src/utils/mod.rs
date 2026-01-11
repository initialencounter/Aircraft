pub mod dialog;
pub mod fs;
pub mod uploader;

use std::net::{Ipv4Addr, SocketAddr, TcpListener};

use chrono::{Local, NaiveDate, Duration};
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
        // Parse the date and calculate ±15 days range
        let date_str = format!("{}-{}-{}", year, month, day);
        let center_date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .map_err(|_| "无效的日期格式")?;

        let start_date = center_date - Duration::days(15);
        let end_date = center_date + Duration::days(15);

        Ok((
            start_date.format("%Y-%m-%d").to_string(),
            end_date.format("%Y-%m-%d").to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_date() {
        let (start, end) = parse_date("PEKGZ202301017777").unwrap();
        println!("Start: {}, End: {}", start, end);


        let (start, end) = parse_date("PEKGZ202300317777").unwrap();
        println!("Start: {}, End: {}", start, end);


        let (start, end) = parse_date("PEKGZ202312317777").unwrap();
        println!("Start: {}, End: {}", start, end);

    }
}


pub fn find_available_port(start_port: u16) -> Option<u16> {
    // 限制最大尝试次数，避免无限循环
    const MAX_ATTEMPTS: u16 = 1000;
    
    for port in start_port..start_port + MAX_ATTEMPTS {
        let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
        
        match TcpListener::bind(addr) {
            Ok(_) => return Some(port),
            Err(_) => continue,
        }
    }
    println!("No available port found starting from {}", start_port);
    None
}
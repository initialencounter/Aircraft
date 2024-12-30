use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::time::SystemTime;

use blake2::{Blake2b512, Digest};
use chrono::{DateTime, Local};
use serde::Serialize;


#[derive(Serialize)]
pub struct FileTile {
    name: String,
    path: String,
    blake2b512: String,
    last_modified: String,
}

fn system_time_to_date_time(time: SystemTime) -> String {
    let datetime: DateTime<Local> = DateTime::from(time);
    // 格式化日期和时间
    return datetime.format("%Y-%m-%d %H:%M:%S").to_string();
}

// 计算单文件Blake2b512
pub fn calculate_blake2b512(path: String) -> FileTile {
    let file = File::open(&path);
    let blank = String::from("--");
    let os_path = Path::new(&path);
    if os_path.is_dir() {
        return FileTile {
            name: String::from("--"),
            blake2b512: String::from("--"),
            last_modified: String::from("--"),
            path,
        };
    }
    let file_name = Path::new(&path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    let file_parent = Path::new(&path)
        .parent()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    return match file {
        Ok(file) => {
            let last_modified = match file.metadata() {
                Ok(metadata) => match metadata.modified() {
                    Ok(time) => system_time_to_date_time(time),
                    Err(_) => blank,
                },
                Err(_) => blank,
            };
            let mut reader = BufReader::new(file);
            let mut hasher = Blake2b512::new();
            let mut buffer = [0u8; 1024];
            loop {
                let n = reader.read(&mut buffer).unwrap();
                if n == 0 {
                    break;
                }
                hasher.update(&buffer[..n]);
            }
            FileTile {
                name: file_name,
                blake2b512: hex::encode(hasher.finalize()),
                last_modified,
                path: file_parent,
            }
        }
        Err(_) => FileTile {
            name: file_name,
            blake2b512: blank,
            last_modified: String::from("--"),
            path: file_parent,
        },
    };
}
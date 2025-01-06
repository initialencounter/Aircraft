use chrono::Local;
use colored::*;
use regex::Regex;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, serde::Serialize)]
pub struct LogMessage {
    pub time_stamp: String,
    pub level: String,
    pub message: String,
}

pub struct Logger {
    enabled: bool,
    file: Arc<Mutex<File>>,
    temp_logs: Arc<Mutex<Vec<LogMessage>>>,
    pub log_tx: Sender<LogMessage>,
}

impl Clone for Logger {
    fn clone(&self) -> Self {
        Logger {
            enabled: self.enabled,
            file: Arc::clone(&self.file),
            temp_logs: Arc::clone(&self.temp_logs),
            log_tx: self.log_tx.clone(),
        }
    }
}

impl Logger {
    pub fn new(log_dir: PathBuf, service_name: &str, enabled: bool, color: bool) -> Self {
        let (sender, receiver) = mpsc::channel::<LogMessage>();

        let file = if enabled {
            std::fs::create_dir_all(&log_dir).expect("无法创建日志目录");
            let log_path = log_dir.join(format!(
                "{}-{}.log",
                service_name,
                Local::now().format("%Y-%m-%d")
            ));
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(log_path)
                .expect("无法打开日志文件")
        } else {
            File::create("NUL").unwrap()
        };

        let file = Arc::new(Mutex::new(file));
        let temp_logs = Arc::new(Mutex::new(Vec::new()));

        let logger = Logger {
            enabled,
            file: Arc::clone(&file),
            temp_logs: Arc::clone(&temp_logs),
            log_tx: sender,
        };

        // 启动全局日志处理任务
        let file_clone = Arc::clone(&file);
        let temp_logs_clone = Arc::clone(&temp_logs);
        let enabled_clone = enabled;
        
        tokio::spawn(async move {
            while let Ok(log) = receiver.recv() {
                let now = Local::now();
                let time_stamp = now.format("%Y-%m-%d %H:%M:%S").to_string();
                let colored_level = match log.level.to_uppercase().as_str() {
                    "ERROR" => log.level.red().bold(),
                    "WARN" => log.level.yellow().bold(),
                    "INFO" => log.level.green().bold(),
                    "DEBUG" => log.level.blue().bold(),
                    _ => log.level.normal(),
                };

                let log_entry = format!("[{}] {} - {}\n", time_stamp, log.level, log.message);

                if enabled_clone {
                    if let Ok(mut file) = file_clone.lock() {
                        let _ = file.write_all(log_entry.as_bytes());
                    }
                }

                let colored_log = format!(
                    "[{}] {} - {}",
                    time_stamp.bright_black(),
                    colored_level,
                    log.message
                );
                if color {
                    println!("{}", colored_log);
                } else {
                    print!("{}", log_entry);
                }

                if let Ok(mut temp_logs) = temp_logs_clone.lock() {
                    temp_logs.push(LogMessage {
                        time_stamp,
                        level: log.level,
                        message: log.message,
                    });
                }
            }
        });

        // 读取历史日志
        if enabled {
            if let Ok(logs) = read_existing_logs(log_dir, service_name) {
                if let Ok(mut temp_logs) = logger.temp_logs.lock() {
                    temp_logs.extend(logs);
                }
            }
        }

        logger
    }

    pub fn log(&self, level: &str, message: &str) {
        let _ = self.log_tx.send(LogMessage {
            time_stamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            level: level.to_string(),
            message: message.to_string(),
        });
    }

    pub fn try_get_logs(&self) -> Vec<LogMessage> {
        if let Ok(mut temp_logs) = self.temp_logs.lock() {
            let logs = temp_logs.clone();
            temp_logs.clear();
            logs
        } else {
            Vec::new()
        }
    }
}

fn read_existing_logs(
    log_dir: PathBuf,
    service_name: &str,
) -> Result<Vec<LogMessage>, std::io::Error> {
    // 获取今天的日期
    let today = Local::now().format("%Y-%m-%d").to_string();
    // 匹配日志格式的正则表达式
    let log_pattern = Regex::new(r"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (\w+) - (.+)")
        .expect("无效的正则表达式");
    let mut temp_logs = Vec::new();
    // 读取日志目录中的所有文件
    for entry in std::fs::read_dir(log_dir)? {
        let entry = entry?;
        let path = entry.path();

        // 只处理今天的日志文件
        if path.is_file()
            && path
                .file_name()
                .and_then(|n| n.to_str())
                .map_or(false, |n| {
                    n.starts_with(service_name) && n.ends_with(&format!("{}.log", today))
                })
        {
            let file = File::open(path)?;
            let reader = BufReader::new(file);

            // 逐行读取日志文件
            for line in reader.lines() {
                let line = line?;

                // 使用正则表达式解析日志行
                if let Some(captures) = log_pattern.captures(&line) {
                    let log_message = LogMessage {
                        time_stamp: captures[1].to_string(),
                        level: captures[2].to_string(),
                        message: captures[3].to_string(),
                    };
                    // 发送日志消息
                    temp_logs.push(log_message);
                }
            }
        }
    }
    Ok(temp_logs)
}

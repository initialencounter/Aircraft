use chrono::Local;
use colored::*;
use regex::Regex;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::sync::mpsc::{self, Sender};

#[derive(Debug, Clone, serde::Serialize)]
pub struct LogMessage {
    pub time_stamp: String,
    pub level: String,
    pub message: String,
}

pub struct Logger {
    enabled: bool,
    file: File,
    temp_logs: Vec<LogMessage>,
    pub log_tx: Sender<LogMessage>,
}

impl Clone for Logger {
    fn clone(&self) -> Self {
        Logger {
            enabled: self.enabled,
            file: self.file.try_clone().unwrap(),
            temp_logs: self.temp_logs.clone(),
            log_tx: self.log_tx.clone(),
        }
    }
}

impl Logger {
    pub fn new(log_dir: PathBuf, service_name: &str, enabled: bool) -> Self {
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

        let mut logger = Logger {
            file,
            enabled,
            temp_logs: Vec::new(),
            log_tx: sender.clone(),
        };

        let mut logger_clone = logger.clone();
        tokio::spawn(async move {
            while let Ok(log) = receiver.recv() {
                logger_clone.log(&log.level, &log.message);
            }
        });

        // 读取历史日志
        if enabled {
            if let Ok(logs) = read_existing_logs(log_dir, service_name) {
                logger.temp_logs.extend(logs);
            }
        }

        logger
    }

    pub fn log(&mut self, level: &str, message: &str) {
        let now = Local::now();
        let time_stamp = now.format("%Y-%m-%d %H:%M:%S").to_string();
        let colored_level = match level.to_uppercase().as_str() {
            "ERROR" => level.red().bold(),
            "WARN" => level.yellow().bold(),
            "INFO" => level.green().bold(),
            "DEBUG" => level.blue().bold(),
            _ => level.normal(),
        };

        let log_entry = format!("[{}] {} - {}\n", time_stamp, level, message);

        if self.enabled {
            self.file
                .write_all(log_entry.as_bytes())
                .expect("写入日志失败");
        }

        let colored_log = format!(
            "[{}] {} - {}",
            time_stamp.bright_black(),
            colored_level,
            message
        );
        println!("{}", colored_log);
        let log_message = LogMessage {
            time_stamp,
            level: level.to_string(),
            message: message.to_string(),
        };
        self.temp_logs.push(log_message);
    }

    pub fn try_get_logs(&mut self) -> Vec<LogMessage> {
        let logs = self.temp_logs.clone();
        self.temp_logs.clear();
        logs
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

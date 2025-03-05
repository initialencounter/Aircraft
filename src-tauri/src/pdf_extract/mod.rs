use pdf_parser::read::read_pdf;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::{fs, thread, vec};
use tokio::runtime::Runtime;

use pdf_parser::uploader::FileManager;
use tauri::Emitter;
use tauri::{AppHandle, Manager};

pub fn handle_pdf_parse_event(app: &AppHandle, paths: &Vec<PathBuf>) {
    let app_clone: AppHandle = app.clone();

    // 启动一个线程处理拖拽的文件或目录
    let paths = paths.clone();
    thread::spawn(move || {
        let rt = Runtime::new().unwrap();
        let mut res: Vec<String> = vec![];
        let app_clone: AppHandle = app_clone.clone();
        rt.block_on(async {
            for path in paths {
                let path_str = path.to_string_lossy().into_owned();
                if path.is_file() && path_str.ends_with(".pdf") {
                    if let Some(pdf_read_result) =
                        handle_parse_file(&app_clone.clone(), path_str).await
                    {
                        res.push(pdf_read_result);
                    }
                } else {
                    res.extend(handle_parse_directory(&app_clone.clone(), path_str).await);
                }
            }
            println!("res: {:?}", res.clone());
            let _ = app_clone.emit("pdf_reader_result", serde_json::json!(res));
        });
    });
}

/// PdfReadResult
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PdfReadResult {
    pub content: String,

    pub file_type: String,

    pub filename: String,

    pub title: String,

    #[serde(rename = "type")]
    pub content_type: String,
}

async fn handle_parse_file(app: &AppHandle, path: String) -> Option<String> {
    let pdf_read_result = read_pdf(&path, false);
    let manager = app.state::<Arc<Mutex<FileManager>>>();

    match pdf_read_result {
        Ok(pdf_read_result) => {
            let mut res = PdfReadResult {
                content: pdf_read_result.text.clone(),
                file_type: "application/pdf".to_string(),
                filename: path.clone(),
                title: "".to_string(),
                content_type: "file".to_string(),
            };
            if pdf_read_result.text.trim().is_empty() {
                res.content = manager
                    .lock()
                    .unwrap()
                    .get_file_content(&path)
                    .await
                    .unwrap();
            }
            return Some(serde_json::to_string(&res).unwrap());
        }
        Err(_e) => return None,
    }
}

async fn handle_parse_directory(app: &AppHandle, path: String) -> Vec<String> {
    let mut res: Vec<String> = vec![];
    match fs::read_dir(path) {
        Ok(entries) => {
            let app_clone: AppHandle = app.clone();
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_path = entry.path().to_string_lossy().into_owned();
                    if file_path.ends_with(".pdf") {
                        if let Some(pdf_read_result) =
                            handle_parse_file(&app_clone, file_path.clone()).await
                        {
                            res.push(pdf_read_result);
                        }
                    }
                }
            }
        }
        Err(e) => eprintln!("Failed to read directory: {}", e),
    }
    return res;
}

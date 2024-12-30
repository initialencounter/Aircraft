use std::path::PathBuf;
use std::sync::mpsc;
use std::{fs, thread};

use tauri::{AppHandle, Manager, Window};
use tauri::Emitter;

use crate::blake2::{calculate_blake2b512, FileTile};

fn handle_file(path: String, tx: mpsc::Sender<FileTile>) {
    let file_tile = calculate_blake2b512(path.to_string());
    tx.send(file_tile).unwrap();
}

fn handle_directory(path: String, tx: mpsc::Sender<FileTile>) {
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_path = entry.path().to_string_lossy().into_owned();
                    handle_file(file_path, tx.clone());
                }
            }
        }
        Err(e) => eprintln!("Failed to read directory: {}", e),
    }
}

pub fn handle_drag_drop_event(window: &Window, paths: &Vec<PathBuf>) {
    println!("handle_drag_drop_event: {:?}", paths);
    let app = window.app_handle();
    let (tx, rx) = mpsc::channel();

    // 启动一个线程处理拖拽的文件或目录
    let paths = paths.clone();
    thread::spawn(move || {
        for path in paths {
            let tx = tx.clone();
            let path_str = path.to_string_lossy().into_owned();
            if path.is_file() {
                handle_file(path_str, tx);
            } else {
                handle_directory(path_str, tx);
            }
        }
    });

    // 启动另一个线程接收和发送文件信息
    let app_clone: AppHandle = app.clone();
    thread::spawn(move || {
        for file_tile in rx {
            app_clone.emit("file_tile", Some(&file_tile)).unwrap();
        }
    });
}

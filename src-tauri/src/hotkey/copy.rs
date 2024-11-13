use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use copypasta::{ClipboardContext, ClipboardProvider};
use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref PROJECT_NO_REGEX: Regex = Regex::new(r"[P|S]EK.{2}\d{12}").unwrap();
}

use native_dialog::{MessageDialog, MessageType};

use enigo::{Direction::Click, Enigo, Key, Keyboard, Settings};


fn popup_message(title: &str, message: &str) -> bool {
    let result = MessageDialog::new()
        .set_title(title)
        .set_text(&message)
        .set_type(MessageType::Warning)
        .show_confirm();
    result.unwrap()
}

#[derive(Serialize, Debug)]
struct SearchParams {
    search: String,
    json: i32,
    path_column: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    path: String,
    name: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct SearchResponse {
    results: Vec<SearchResult>,
}

pub async fn search(file_path: String) -> Vec<SearchResult> {
    let client = Client::new();
    let query = SearchParams {
        search: file_path,
        json: 1,
        path_column: 1,
    };
    let response = client
        .get("http://127.0.0.1:25456")
        .query(&query)
        .send()
        .await;
    let response = match response {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Request failed: {}", e);
            return vec![];
        }
    };
    if response.status().is_success() {
        let text = response.text().await.unwrap();
        // 使用新的结构体解析 JSON
        let result: SearchResponse = serde_json::from_str(&text).unwrap();
        return result.results;
    }
    return vec![];
}

fn simulate_f5_press() {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    enigo.key(Key::F5, Click).unwrap();
}

fn copy_to_here(search_result: Vec<SearchResult>, target_path: String) -> () {
    let mut file_list = vec![];
    for result in search_result {
        let source_path = format!("{}\\{}", result.path, result.name);
        if result.name.is_empty() {
            continue;
        }
        if result.name.ends_with(".doc") || result.name.ends_with(".docx") {
            file_list.push(source_path);
        }
    }

    if !popup_message("确认复制文件?", &file_list.join("\n")) {
        return;
    }
    for source_path in file_list {
        let target_path = target_path.clone() + "\\" + &source_path.split("\\").last().unwrap();
        if let Err(e) = fs::copy(&source_path, &target_path) {
            eprintln!("Failed to copy {} to {}: {}", source_path, target_path, e);
        }
    }

    // 复制完成后模拟按下 F5
    simulate_f5_press();
}

fn get_clip_text() -> String {
    let mut ctx: ClipboardContext = ClipboardContext::new().unwrap();
    let clip_text = ctx.get_contents().unwrap();
    return clip_text;
}

fn check_project_no(project_no: &str) -> bool {
    return PROJECT_NO_REGEX.is_match(project_no);
}

pub async fn copy_file_to_here(target_dir: String) {
    let clip_text = get_clip_text();
    if !check_project_no(&clip_text) {
        popup_message("项目编号不合法", "请检查项目编号是否正确");
        return;
    }
    let search_result = search(clip_text).await;
    copy_to_here(search_result, target_dir);
}

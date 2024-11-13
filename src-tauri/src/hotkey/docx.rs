use chrono::Local;
use copypasta::{ClipboardContext, ClipboardProvider};
use reqwest::Client;
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use std::env;
use std::fs;
use crate::utils::popup_message;
use std::path::PathBuf;
use std::process::Command;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[derive(Deserialize, Serialize)]
struct QueryResult {
    rows: Vec<ProjectRow>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRow {
    item_c_name: String,
    item_e_name: String,
    edit_status: i64,
    project_id: String,
    project_no: String,
}

#[derive(Deserialize, Serialize)]
struct EditDocResponse {
    message: String,
    save_path: String,
}

async fn send_task(path: String, project_no: &str) -> Result<()> {
    let client = Client::new();
    let today_date = get_today_date();
    let request_body = json!({
        "source_path": &path,
        "project_no": project_no,
        "date": today_date,
        "signature_img_path": env::current_exe().unwrap().parent().unwrap().join("signature.png").to_str().unwrap()

    });

    // 发送POST请求
    let response = client
        .post("http://localhost:25457/edit-docx")
        .json(&request_body)
        .send()
        .await?;

    // 检查响应状态
    if response.status().is_success() {
        let _res: EditDocResponse = response.json().await?;
        open_file_with_default_program(&path);
    } else {
        popup_message("替换文件失败", "替换文件失败");
    }

    Ok(())
}

fn get_clip_text() -> String {
    let mut ctx: ClipboardContext = ClipboardContext::new().unwrap();
    let clip_text = ctx.get_contents().unwrap();
    return clip_text;
}

fn open_file_with_default_program(path: &str) {
    Command::new("cmd")
        .args(&["/C", "start", "", path])
        .spawn()
        .expect("Failed to open file with default program");
}

async fn match_file(dir: &PathBuf, project_no: &str) {
    let mut file_path_list = vec![];
    let mut file_name_list = vec![];
    for entry in fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            continue;
        }
        let file_name = path.file_name().unwrap().to_str().unwrap().to_string();
        if !file_name.contains("概要") {
            continue;
        }
        // 检查文件名是否符合要求
        if !file_name.ends_with(".docx") {
            continue;
        }
        if !file_name.starts_with("PEK") && !file_name.starts_with("SEK") {
            continue;
        }
        file_path_list.push(path.to_str().unwrap().to_string());
        file_name_list.push(file_name.to_string());
    }
    if !popup_message("是否要修改这些概要？", &file_name_list.join("\n")) {
        return;
    }
    for path in file_path_list {
        let _ = send_task(path, project_no).await;
    }
}

fn get_today_date() -> String {
    // 获取当前日期
    let today = Local::now().naive_local().date();

    // 格式化为 YYYY-MM-DD
    let formatted_date = today.format("%Y-%m-%d").to_string();
    formatted_date
}

pub async fn replace_docx(target_dir: String) {
    let clip_text = get_clip_text();
    match_file(&PathBuf::from(&target_dir), &clip_text).await;
}

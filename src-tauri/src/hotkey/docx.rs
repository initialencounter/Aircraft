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
    let exe_path = env::current_exe()
        .map_err(|e| format!("无法获取执行文件路径: {}", e))?;
    let parent_path = exe_path
        .parent()
        .ok_or("无法获取父目录")?;
    let signature_path_buf = parent_path.join("signature.png");
    let signature_path = signature_path_buf
        .to_str()
        .ok_or("路径转换失败")?;

    let request_body = json!({
        "source_path": &path,
        "project_no": project_no,
        "date": today_date,
        "signature_img_path": signature_path
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

fn get_clip_text() -> Result<String> {
    let mut ctx: ClipboardContext = ClipboardContext::new()
        .map_err(|e| format!("无法创建剪贴板上下文: {}", e))?;
    let clip_text = ctx.get_contents()
        .map_err(|e| format!("无法获取剪贴板内容: {}", e))?;
    Ok(clip_text)
}

fn open_file_with_default_program(path: &str) {
    Command::new("cmd")
        .args(&["/C", "start", "", path])
        .spawn()
        .expect("Failed to open file with default program");
}

async fn match_file(dir: &PathBuf, project_no: &str) -> Result<()> {
    let mut file_path_list = vec![];
    let mut file_name_list = vec![];
    
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("无法读取目录: {}", e))?;
        
    for entry in entries {
        let entry = entry.map_err(|e| format!("无法读取目录项: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            continue;
        }
        
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无效的文件名")?
            .to_string();
            
        if !file_name.contains("概要") {
            continue;
        }
        if !file_name.ends_with(".docx") {
            continue;
        }
        if !file_name.starts_with("PEK") && !file_name.starts_with("SEK") {
            continue;
        }
        
        file_path_list.push(path.to_str().ok_or("路径转换失败")?.to_string());
        file_name_list.push(file_name);
    }
    
    if !popup_message("是否要修改这些概要？", &file_name_list.join("\n")) {
        return Ok(());
    }
    
    for path in file_path_list {
        send_task(path, project_no).await?;
    }
    
    Ok(())
}

fn get_today_date() -> String {
    // 获取当前日期
    let today = Local::now().naive_local().date();

    // 格式化为 YYYY-MM-DD
    let formatted_date = today.format("%Y-%m-%d").to_string();
    formatted_date
}

pub async fn replace_docx(target_dir: String) -> Result<()> {
    let clip_text = get_clip_text()?;
    match_file(&PathBuf::from(&target_dir), &clip_text).await?;
    Ok(())
}

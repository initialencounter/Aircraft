use copypasta::{ClipboardContext, ClipboardProvider};
use enigo::{Direction::Click, Enigo, Key, Keyboard, Settings};
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::Client;
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use std::env;
use crate::utils::popup_message;
use std::process::Command;

lazy_static! {
    static ref PROJECT_NO_REGEX: Regex = Regex::new(r"[P|S|A|R]EK.{2}\d{12}").unwrap();
}

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

fn check_project_no(project_no: &str) -> bool {
    PROJECT_NO_REGEX.is_match(project_no)
}

fn simulate_f5_press() {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    enigo.key(Key::F5, Click).unwrap();
}

async fn send_task(request_body: &serde_json::Value) -> Result<()> {
    let client = Client::new();

    // 发送POST请求
    let response = client
        .post("http://localhost:25457/edit-doc")
        .json(&request_body)
        .send()
        .await?;

    // 检查响应状态
    if response.status().is_success() {
        let res: EditDocResponse = response.json().await?;
        let save_path = res.save_path;
        let _ = open_file_with_default_program(&save_path);
    } else {
        println!("Failed to edit document: {:?}", response.text().await?);
    }

    Ok(())
}


fn get_clip_text() -> Result<String> {
    let mut ctx: ClipboardContext = ClipboardContext::new()
        .map_err(|e| format!("无法访问剪贴板: {}", e))?;
    let clip_text = ctx.get_contents()
        .map_err(|e| format!("无法获取剪贴板内容: {}", e))?;
    Ok(clip_text)
}

async fn get_project_info(project_no: &str) -> Result<QueryResult> {
    let client = Client::new();
    
    let response = client
        .get(format!(
            "http://localhost:25455/get-project-info/{}",
            project_no
        ))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if response.status().is_success() {
        let res: QueryResult = response.json().await?;
        Ok(res)
    } else {
        Err("未找到项目信息".into())
    }
}

fn open_file_with_default_program(path: &str) -> Result<()> {
    Command::new("cmd")
        .args(&["/C", "start", "", path])
        .spawn()
        .map_err(|e| format!("无法打开文件: {}", e))?;
    Ok(())
}

pub async fn write_doc(target_dir: String) -> Result<()> {
    let clip_text = get_clip_text()?;
    if !check_project_no(&clip_text) {
        popup_message(
            "项目编号不合法",
            &format!("请检查项目编号是否正确: {}", clip_text),
        );
        return Ok(());
    }

    match get_project_info(&clip_text).await {
        Ok(project_info) => {
            let item_c_name = project_info.rows[0].item_c_name.clone();
            let item_e_name = project_info.rows[0].item_e_name.clone();
            let is_965 = if item_c_name.contains("内置") || item_c_name.contains("包装") {
                false
            } else {
                true
            };
            let is_power_bank =
                item_c_name.contains("移动电源") || item_c_name.contains("储能电源");
                
            let exe_path = env::current_exe()
                .map_err(|e| format!("无法获取执行路径: {}", e))?;
            let parent_path = exe_path.parent()
                .ok_or("无法获取父目录")?;
            let source_path = parent_path.join("image.doc")
                .to_str()
                .ok_or("路径转换失败")?
                .to_string();
                
            let en_name = item_e_name.split(" ")
                .nth(1)
                .ok_or("无法解析英文名称")?;
                
            let request_body = json!({
                "source_path": source_path,
                "save_dir": target_dir,
                "project_no": clip_text,
                "project_name": item_c_name,
                "is_965": is_965,
                "is_power_bank": is_power_bank,
                "en_name": en_name
            });
            
            match send_task(&request_body).await {
                Ok(_) => {
                    simulate_f5_press();
                    Ok(())
                }
                Err(e) => {
                    popup_message("写入文档失败", &e.to_string());
                    Err(e)
                }
            }
        }
        Err(e) => {
            popup_message("项目信息获取失败", "请检查项目编号是否正确");
            Err(e)
        }
    }
}

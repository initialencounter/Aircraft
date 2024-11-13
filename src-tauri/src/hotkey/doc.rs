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
    static ref PROJECT_NO_REGEX: Regex = Regex::new(r"[P|S]EK.{2}\d{12}").unwrap();
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
    return PROJECT_NO_REGEX.is_match(project_no);
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
        open_file_with_default_program(&save_path);
    } else {
        println!("Failed to edit document: {:?}", response.text().await?);
    }

    Ok(())
}


fn get_clip_text() -> String {
    let mut ctx: ClipboardContext = ClipboardContext::new().unwrap();
    let clip_text = ctx.get_contents().unwrap();
    return clip_text;
}

async fn get_project_info(project_no: &str) -> Result<QueryResult> {
    let client = Client::new();
    println!("get_project_info: {}", project_no);
    // 发送POST请求
    let response = client
        .get(format!(
            "http://localhost:25455/get-project-info/{}",
            project_no
        ))
        .send()
        .await
        .unwrap();

    // 检查响应状态
    if response.status().is_success() {
        let res: QueryResult = response.json().await?;
        Ok(res)
    } else {
        Err("未找到项目信息".into())
    }
}

fn open_file_with_default_program(path: &str) {
    Command::new("cmd")
        .args(&["/C", "start", "", path])
        .spawn()
        .expect("Failed to open file with default program");
}

pub async fn write_doc(target_dir: String) {
    let clip_text = get_clip_text();
    if !check_project_no(&clip_text) {
        popup_message(
            "项目编号不合法",
            &format!("请检查项目编号是否正确: {}", clip_text),
        );
        return;
    }
    println!("项目编号: {}", clip_text);

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
            // 构建请求体
            let request_body = json!({
                "source_path": env::current_exe().unwrap().parent().unwrap().join("image.doc").to_str().unwrap(),
                "save_dir": target_dir,
                "project_no": clip_text,
                "project_name": item_c_name,
                "is_965": is_965,
                "is_power_bank": is_power_bank,
                "en_name": item_e_name.split(" ").nth(1).unwrap()
            });
            send_task(&request_body).await.unwrap();
            simulate_f5_press();
        }
        _ => {
            popup_message("项目信息获取失败", "请检查项目编号是否正确");
        }
    }
}

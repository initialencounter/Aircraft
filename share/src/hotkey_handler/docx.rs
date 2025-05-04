use crate::summary_rs::modify_docx;
use crate::utils::popup_message;
use lazy_static::lazy_static;
use regex::Regex;
use serde::Deserialize;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;



type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

lazy_static! {
    static ref RE_IMAGE_EXTENT: Regex = Regex::new(r#"cx="(\d+)" cy="(\d+)""#).unwrap();
    static ref RE_IMAGE_BEHIND_DOCUMENT: Regex = Regex::new(r#"behindDoc="(\d)""#).unwrap();
}

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

async fn match_file(dir: &PathBuf) -> Result<Vec<String>> {
    let mut file_path_list = vec![];
    let mut file_name_list = vec![];

    let entries = fs::read_dir(dir).map_err(|e| format!("无法读取目录: {}", e))?;

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
        if !["PEK", "SEK", "AEK", "REK"]
            .iter()
            .any(|prefix| file_name.starts_with(prefix))
        {
            continue;
        }

        file_path_list.push(path.to_str().ok_or("路径转换失败")?.to_string());
        file_name_list.push(file_name);
    }

    if !popup_message("是否要修改这些概要？", &file_name_list.join("\n")) {
        return Ok(vec![]);
    }

    Ok(file_path_list)
}

pub async fn replace_docx(target_dir: String, inspector: &str, width: f32, height: f32) -> Result<()> {
    let file_list = match_file(&PathBuf::from(&target_dir)).await?;
    for path in file_list {
        let _ = modify_docx(&path, inspector, width, height);
    }
    Ok(())
}

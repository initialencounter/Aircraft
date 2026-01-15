use crate::utils::popup_message;
use aircraft_types::{
    others::{SearchParams, SearchResponse, SearchResult},
    project::{DataModel, SearchProperty, SearchPropertyParams},
};
use copypasta::{ClipboardContext, ClipboardProvider};
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::Client;
use std::fs;
lazy_static! {
    static ref PROJECT_NO_REGEX: Regex = Regex::new(r"[P|S|A|R]EK.{2}\d{12}").unwrap();
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
        match response.text().await {
            Ok(text) => match serde_json::from_str::<SearchResponse>(&text) {
                Ok(result) => result.results,
                Err(e) => {
                    eprintln!("Failed to parse JSON: {}", e);
                    vec![]
                }
            },
            Err(e) => {
                eprintln!("Failed to get response text: {}", e);
                vec![]
            }
        }
    } else {
        eprintln!("Request failed: {}", response.status());
        vec![]
    }
}

pub async fn search_property(data: SearchProperty) -> Vec<DataModel> {
    let client = Client::new();
    let query = SearchPropertyParams {
        search_text: data.search_text,
    };
    let response = client.get(&data.url).query(&query).send().await;
    let response = match response {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Request failed: {}", e);
            return vec![];
        }
    };
    if response.status().is_success() {
        match response.text().await {
            Ok(text) => match serde_json::from_str::<Vec<DataModel>>(&text) {
                Ok(result) => result,
                Err(e) => {
                    eprintln!("Failed to parse JSON: {}", e);
                    vec![]
                }
            },
            Err(e) => {
                eprintln!("Failed to get response text: {}", e);
                vec![]
            }
        }
    } else {
        eprintln!("Request failed: {}", response.status());
        vec![]
    }
}

fn copy_to_here(search_result: Vec<SearchResult>, target_path: String) {
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
        let file_name = match source_path.split('\\').last() {
            Some(name) => name,
            None => {
                eprintln!("Invalid source path: {}", source_path);
                continue;
            }
        };
        let target_path = format!("{}\\{}", target_path, file_name);

        if let Err(e) = fs::copy(&source_path, &target_path) {
            eprintln!("Failed to copy {} to {}: {}", source_path, target_path, e);
        }
    }
}

fn get_clip_text() -> Option<String> {
    match ClipboardContext::new() {
        Ok(mut ctx) => ctx.get_contents().ok(),
        Err(e) => {
            eprintln!("Failed to create clipboard context: {}", e);
            None
        }
    }
}

fn check_project_no(project_no: &str) -> bool {
    PROJECT_NO_REGEX.is_match(project_no)
}

pub async fn copy_file_to_here(target_dir: String) {
    let clip_text = match get_clip_text() {
        Some(text) => text,
        None => {
            popup_message("剪贴板错误", "无法读取剪贴板内容");
            return;
        }
    };

    if !check_project_no(&clip_text) {
        popup_message("项目编号不合法", "请检查项目编号是否正确");
        return;
    }
    let search_result = search(clip_text).await;
    copy_to_here(search_result, target_dir);
}

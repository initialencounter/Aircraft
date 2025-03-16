use super::http_client::HttpClient;
use crate::attachment_parser::get_attachment_info;
use crate::logger::LogMessage;
use bytes::BufMut;
use futures_util::StreamExt;
use pdf_parser::read::read_pdf_u8;
use pdf_parser::uploader::FileManager;
use serde::Serialize;
use std::collections::HashMap;
use std::fmt;
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use warp::multipart::FormData;
use warp::reject::Reject;
use warp::{Filter, Rejection, Reply};
// 自定义错误类型
#[derive(Debug, Serialize)]
struct CustomError {
    message: String,
}

impl fmt::Display for CustomError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Reject for CustomError {}

#[derive(serde::Deserialize, serde::Serialize)]
struct DirectoryInfo {
    dir: String,
}

pub fn apply_webhook(
    port: u16,
    log_tx: Sender<LogMessage>,
    client: Arc<Mutex<HttpClient>>,
    file_manager: Arc<Mutex<FileManager>>,
) -> JoinHandle<()> {
    // 设置 webhook 路由
    let routes = warp::post()
        .and(warp::path("upload"))
        .and(warp::body::content_length_limit(1024 * 16))
        .and(warp::body::json())
        .and(warp::any().map({
            let client = client.clone();
            move || client.clone()
        }))
        .then(
            move |dir: DirectoryInfo, client: Arc<Mutex<HttpClient>>| async move {
                let files = client
                    .lock()
                    .await
                    .post_file_from_directory(PathBuf::from(&dir.dir))
                    .await;
                warp::reply::json(&files)
            },
        );
    let selected_routes = warp::post()
        .and(warp::path("upload-selected"))
        .and(warp::body::content_length_limit(1024 * 16))
        .and(warp::body::json())
        .and(warp::any().map({
            let client = client.clone();
            move || client.clone()
        }))
        .then(
            move |file_list: Vec<String>, client: Arc<Mutex<HttpClient>>| async move {
                let files = client
                    .lock()
                    .await
                    .post_file_from_file_list(file_list)
                    .await;
                warp::reply::json(&files)
            },
        );
    let doc_routes = warp::get()
        .and(warp::path("get-project-info"))
        .and(warp::path::param::<String>())
        .and(warp::any().map({
            let client = client.clone();
            move || client.clone()
        }))
        .then(
            move |project_no: String, client: Arc<Mutex<HttpClient>>| async move {
                client
                    .lock()
                    .await
                    .log("INFO", &format!("GET /get-project-info: {:?}", project_no))
                    .await;

                // 处理所有可能的错误情况
                match client.lock().await.get_project_info(&project_no).await {
                    Ok(result) => warp::reply::json(&result),
                    Err(e) => warp::reply::json(&CustomError {
                        message: format!("获取项目信息失败: {}", e),
                    }),
                }
            },
        );
    let log_tx_clone = log_tx.clone();
    let get_summary_info =
        warp::get()
            .and(warp::path("get-attachment-info"))
            .and(warp::path::param::<String>())
            .and(warp::query::<HashMap<String, String>>())
            .and(warp::any().map(move || log_tx_clone.clone()))
            .then(
                |project_no: String,
                 params: HashMap<String, String>,
                 log_tx: Sender<LogMessage>| async move {
                    // 从 params 中获取 label 参数
                    let label = params.get("label").map(|s| s.as_str()).unwrap_or("1");
                    let return_label = label == "1";
                    match get_attachment_info(project_no, log_tx, return_label).await {
                        Ok(summary_info) => warp::reply::json(&summary_info),
                        Err(e) => warp::reply::json(&CustomError {
                            message: format!("获取项目信息失败: {}", e),
                        }),
                    }
                },
            );

    let llm_files_handle = warp::post()
        .and(warp::path("upload-llm-files"))
        .and(warp::multipart::form().max_length(10_000_000))
        .and(warp::any().map({
            let file_manager = file_manager.clone();
            move || file_manager.clone()
        }))
        .then(
            move |form, file_manager: Arc<Mutex<FileManager>>| async move {
                let res = handle_upload(form, file_manager).await;
                match res {
                    Ok(reply) => Ok(reply),
                    Err(e) => Err(warp::reply::json(&CustomError {
                        message: format!("LLM Parse err:{:?}", e),
                    })),
                }
            },
        );
    let cors = warp::cors()
        .allow_any_origin() // 允许所有来源
        .allow_headers(vec!["content-type"]) // 允许的请求头
        .allow_methods(vec!["POST", "GET", "OPTIONS"]); // 允许的HTTP方法
    let combined_routes = routes
        .or(doc_routes)
        .or(selected_routes)
        .or(get_summary_info)
        .or(llm_files_handle)
        .with(cors);
    // 启动 web 服务器
    let server = warp::serve(combined_routes).run(([127, 0, 0, 1], port));
    tokio::spawn(server)
}

// 自定义错误类型，处理可能的错误（需实现 Reject）
#[derive(Debug)]
struct UploadError;
impl warp::reject::Reject for UploadError {}

async fn handle_upload(
    mut form: FormData,
    file_manager: Arc<Mutex<FileManager>>,
) -> Result<impl Reply, Rejection> {
    let mut file_contents: Vec<String> = vec![];
    while let Some(part) = form.next().await {
        let part: warp::multipart::Part = part.map_err(|_e| warp::reject::custom(UploadError))?;

        if part.name() == "file" {
            let filename = part
                .filename()
                .ok_or_else(|| warp::reject::custom(UploadError))?
                .to_string();

            let file_data: Vec<u8> = convert_file_part_to_vecu8(part).await;
            // save_part_to_file(part.clone()).await;
            let mut file_content = match read_pdf_u8(file_data.clone()) {
                Ok(pdf) => pdf.text,
                Err(e) => {
                    println!("Error: 读取 pdf Vec<u8> 失败: {:?}", e);
                    "".to_string()
                }
            };
            if file_content.trim().is_empty() {
                let file_part1: reqwest::multipart::Part =
                    convert_file_part(filename, file_data).await;
                file_content = match file_manager.lock().await.get_part_text(file_part1).await {
                    Ok(text) => {
                        println!("text: {:?}", text.clone());
                        text
                    }
                    Err(e) => {
                        println!("Error: OCR {:?}", e);
                        "".to_string()
                    }
                };
            }
            file_contents.push(file_content);
        }
    }
    let res = file_manager
        .lock()
        .await
        .chat_with_ai_fast_and_cheap(file_contents)
        .await;

    match res {
        Ok(json) => {
            Ok(warp::reply::json(&json))
        }
        Err(e) => Ok(warp::reply::json(&CustomError {
            message: format!("获取项目信息失败: {}", e),
        })),
    }
}

async fn convert_file_part(filename: String, file_data: Vec<u8>) -> reqwest::multipart::Part {
    // 构建 reqwest Part
    let reqwest_part = reqwest::multipart::Part::bytes(file_data)
        .file_name(filename) // Convert `file_path` to an owned `String`
        .mime_str("application/pdf")
        .unwrap();

    reqwest_part
}

async fn convert_file_part_to_vecu8(mut warp_part: warp::multipart::Part) -> Vec<u8> {
    let mut file_data: Vec<u8> = Vec::new();

    // field.data() only returns a piece of the content, you should call over it until it replies None
    while let Some(content) = warp_part.data().await {
        let content = content.unwrap();
        file_data.put(content);
    }

    file_data
}

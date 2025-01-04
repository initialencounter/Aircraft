use super::http_client::HttpClient;
use crate::attachment_parser::get_attachment_info;
use crate::logger::LogMessage;
use serde::Serialize;
use std::collections::HashMap;
use std::fmt;
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use warp::reject::Reject;
use warp::Filter;

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
    let cors = warp::cors()
        .allow_any_origin() // 允许所有来源
        .allow_headers(vec!["content-type"]) // 允许的请求头
        .allow_methods(vec!["POST", "GET", "OPTIONS"]); // 允许的HTTP方法
    let combined_routes = routes
        .or(doc_routes)
        .or(selected_routes)
        .or(get_summary_info)
        .with(cors);
    // 启动 web 服务器
    let server = warp::serve(combined_routes).run(([127, 0, 0, 1], port));
    tokio::spawn(server)
}

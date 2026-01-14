use super::http_client::HttpClient;
use crate::attachment_parser::get_attachment_info;
use crate::config::ConfigManager;
use crate::hotkey_handler::copy::{search, search_property};
use crate::manager::clipboard_snapshot_manager::ClipboardSnapshotManager;
use crate::manager::hotkey_manager::HotkeyManager;
use crate::utils::uploader::FileManager;
use crate::utils::{find_available_port, set_clipboard_text};
use aircraft_types::config::Config;
use aircraft_types::others::LoginRequest;
use aircraft_types::project::SearchProperty;
use aircraft_types::summary::SummaryInfo;
use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use pdf_parser::read::read_pdf_u8;
use serde::Serialize;
use std::collections::HashMap;
use std::fmt;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use summary::get_summary_info_by_buffer;
use tokio::task::JoinHandle;
use tower_http::cors::CorsLayer;
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

impl std::error::Error for CustomError {}

impl IntoResponse for CustomError {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
struct DirectoryInfo {
    dir: String,
}

pub static SERVER_PORT: AtomicU64 = AtomicU64::new(25455);

// 应用状态
#[derive(Clone)]
struct AppState {
    client: Arc<HttpClient>,
    file_manager: Arc<FileManager>,
    hotkey_manager: Arc<HotkeyManager>,
    clipboard_snapshot_manager: Arc<ClipboardSnapshotManager>,
}

pub async fn apply_webhook(
    port: u16,
    client: Arc<HttpClient>,
    file_manager: Arc<FileManager>,
    hotkey_manager: Arc<HotkeyManager>,
    clipboard_snapshot_manager: Arc<ClipboardSnapshotManager>,
) -> JoinHandle<()> {
    let current_port = find_available_port(port).unwrap();
    client
        .log(
            "INFO",
            &format!("Webhook 服务器正在监听端口: {}", current_port),
        )
        .await;
    SERVER_PORT.store(current_port as u64, std::sync::atomic::Ordering::Relaxed);

    let state = AppState {
        client,
        file_manager,
        hotkey_manager,
        clipboard_snapshot_manager,
    };

    let app = Router::new()
        .route("/upload", post(upload_handler))
        .route("/upload-selected", post(upload_selected_handler))
        .route(
            "/get-project-info/{project_no}",
            get(get_project_info_handler),
        )
        .route(
            "/get-attachment-info/{project_no}",
            get(get_attachment_info_handler),
        )
        .route("/get-summary-info", post(get_summary_info_handler))
        .route("/upload-llm-files", post(upload_llm_files_handler))
        .route("/ping", get(ping_handler))
        .route("/get-captcha", get(get_captcha_handler))
        .route("/login", post(login_handler))
        .route("/get-config", get(get_config_handler))
        .route("/save-config", post(save_config_handler))
        .route("/reload-config", post(reload_config_handler))
        .route(
            "/reload-clipkeeper-config",
            post(reload_clipkeeper_config_handler),
        )
        .route("/set-clipboard-text", post(set_clipboard_text_handler))
        .route("/search-file", post(search_file_handler))
        .route("/search-property", post(search_property_handler))
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024)) // 设置最大请求体为 100MB
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], current_port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    })
}

// 路由处理器
async fn upload_handler(State(state): State<AppState>, Json(dir): Json<DirectoryInfo>) -> Response {
    let files = state
        .client
        .post_file_from_directory(PathBuf::from(&dir.dir))
        .await;
    Json(files).into_response()
}

async fn upload_selected_handler(
    State(state): State<AppState>,
    Json(file_list): Json<Vec<String>>,
) -> Response {
    let files = state.client.post_file_from_file_list(file_list).await;
    Json(files).into_response()
}

async fn get_project_info_handler(
    State(state): State<AppState>,
    Path(project_no): Path<String>,
) -> Response {
    state
        .client
        .log("INFO", &format!("GET /get-project-info: {:?}", project_no))
        .await;

    match state.client.get_project_info(&project_no).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => Json(CustomError {
            message: format!("获取项目信息失败: {}", e),
        })
        .into_response(),
    }
}

async fn get_attachment_info_handler(
    Path(project_no): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    let is_965 = params.get("is_965").map(|s| s.as_str()).unwrap_or("0") == "1";
    match get_attachment_info(project_no, is_965).await {
        Ok(summary_info) => Json(summary_info).into_response(),
        Err(e) => Json(CustomError {
            message: format!("获取项目信息失败: {}", e),
        })
        .into_response(),
    }
}

async fn get_summary_info_handler(mut multipart: Multipart) -> Response {
    match handle_summary_parse(&mut multipart).await {
        Ok(summary_info) => Json(summary_info).into_response(),
        Err(e) => {
            eprintln!("Summary Parse error: {:?}", e);
            Json(CustomError {
                message: format!("Summary Parse err:{:?}", e),
            })
            .into_response()
        }
    }
}

async fn upload_llm_files_handler(State(state): State<AppState>, multipart: Multipart) -> Response {
    match handle_upload(multipart, state.file_manager).await {
        Ok(json) => Json(json).into_response(),
        Err(e) => {
            eprintln!("LLM Parse error: {:?}", e);
            Json(CustomError {
                message: format!("LLM Parse err:{:?}", e),
            })
            .into_response()
        }
    }
}

async fn ping_handler() -> Json<&'static str> {
    Json("pong")
}

async fn get_captcha_handler(State(state): State<AppState>) -> Response {
    match state.client.get_captcha().await {
        Ok(captcha) => Json(captcha).into_response(),
        Err(e) => Json(CustomError {
            message: format!("获取验证码失败: {}", e),
        })
        .into_response(),
    }
}

async fn login_handler(
    State(state): State<AppState>,
    Json(login_req): Json<LoginRequest>,
) -> Response {
    match state
        .client
        .login_with_captcha(&login_req.code, &login_req.username, &login_req.password)
        .await
    {
        Ok(_) => Json(serde_json::json!({"success": true, "message": "登录成功"})).into_response(),
        Err(e) => Json(CustomError {
            message: format!("登录失败: {}", e),
        })
        .into_response(),
    }
}

async fn get_config_handler() -> Json<Config> {
    Json(ConfigManager::get_config())
}

async fn save_config_handler(Json(config): Json<Config>) -> Json<serde_json::Value> {
    ConfigManager::save_config(&config);
    if config.server.debug {
        crate::task_proxy::http_client::DEBUG_MODE
            .store(true, std::sync::atomic::Ordering::Relaxed);
    } else {
        crate::task_proxy::http_client::DEBUG_MODE
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }
    Json(serde_json::json!({"success": true, "message": "配置已保存"}))
}

async fn reload_config_handler(
    State(state): State<AppState>,
    Json(config): Json<Config>,
) -> Json<serde_json::Value> {
    ConfigManager::save_config(&config);
    state.hotkey_manager.reload();
    state.clipboard_snapshot_manager.reload();
    Json(serde_json::json!({"success": true, "message": "配置已重载"}))
}

async fn reload_clipkeeper_config_handler(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    state.clipboard_snapshot_manager.reload();
    Json(serde_json::json!({"success": true, "message": "剪贴板配置已重载"}))
}

async fn set_clipboard_text_handler(Json(text): Json<String>) -> Json<serde_json::Value> {
    set_clipboard_text(text);
    Json(serde_json::json!({"success": true, "message": "剪贴板文本已设置"}))
}

async fn search_file_handler(Json(file_name): Json<String>) -> Json<serde_json::Value> {
    Json(serde_json::json!(search(file_name).await))
}

async fn search_property_handler(Json(request): Json<SearchProperty>) -> Json<serde_json::Value> {
    Json(serde_json::json!(search_property(request).await))
}

// 自定义错误类型,处理可能的错误
#[derive(Debug)]
struct UploadError;

impl fmt::Display for UploadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Upload error")
    }
}

impl std::error::Error for UploadError {}

async fn handle_upload(
    mut multipart: Multipart,
    file_manager: Arc<FileManager>,
) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let mut file_contents: Vec<String> = vec![];

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        eprintln!("Failed to read multipart field: {:?}", e);
        format!("Failed to read multipart field: {}", e)
    })? {
        if field.name() == Some("file") {
            let file_data = field.bytes().await.map_err(|e| {
                eprintln!("Failed to read file bytes: {:?}", e);
                format!("Failed to read file bytes: {}", e)
            })?;
            let file_data_vec: Vec<u8> = file_data.to_vec();

            let file_content = match read_pdf_u8(&file_data_vec) {
                Ok(pdf) => pdf.text,
                Err(e) => {
                    eprintln!("Error: 读取 pdf Vec<u8> 失败: {:?}", e);
                    return Err("读取 pdf Vec<u8> 失败".into());
                }
            };

            if file_content.trim().is_empty() {
                return Err("读取 pdf Vec<u8> 失败".into());
            }
            file_contents.push(file_content);
        }
    }

    let res = file_manager
        .chat_with_ai_fast_and_cheap(file_contents)
        .await;

    match res {
        Ok(json) => Ok(serde_json::json!(json)),
        Err(e) => Err(Box::new(CustomError {
            message: format!("获取项目信息失败: {}", e),
        }) as Box<dyn std::error::Error>),
    }
}

async fn handle_summary_parse(
    multipart: &mut Multipart,
) -> Result<SummaryInfo, Box<dyn std::error::Error>> {
    let field = multipart.next_field().await?.ok_or(UploadError)?;
    let file_data = field.bytes().await?;
    let file_data_vec: Vec<u8> = file_data.to_vec();

    let summary_info = get_summary_info_by_buffer(&file_data_vec).unwrap_or(SummaryInfo::default());
    Ok(summary_info)
}

use std::env;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

use reqwest::header;
use reqwest::{multipart, Client};
use warp::Filter;

use crate::logger::Logger;
use crate::utils::{
    build_confirmation_message, get_today_date, match_file, parse_date, popup_message,
    prepare_file_info, RawFileInfo,
};

use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};

use std::fmt;
use warp::reject::Reject;


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

pub static LOGIN_STATUS: AtomicBool = AtomicBool::new(false);


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

#[derive(serde::Deserialize, serde::Serialize)]
struct DirectoryInfo {
    dir: String,
}

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

struct HttpClient {
    client: Client,
    base_url: String,
    username: String,
    password: String,
    debug: bool,
    logger: Arc<Mutex<Logger>>,
}

impl HttpClient {
    fn new(
        base_url: String,
        username: String,
        password: String,
        debug: bool,
        log_enabled: bool,
    ) -> Self {
        let client = reqwest::Client::builder()
            .cookie_store(true)
            .build()
            .unwrap();
        let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
        let log_dir = PathBuf::from(current_exe.parent().unwrap().join("logs"));
        let logger = Arc::new(Mutex::new(Logger::new(log_dir, "server", log_enabled)));

        HttpClient {
            client,
            base_url,
            username,
            password,
            debug,
            logger,
        }
    }
    async fn heartbeat(&self) -> Result<()> {
        let today_date = get_today_date();
        if let Ok(result) = self
            .query_project(&format!(
                "systemId=sek&startDate={}&endDate={}&page=1&rows=10",
                today_date, today_date
            ))
            .await
        {
            LOGIN_STATUS.store(true, Ordering::Relaxed);
            self.logger
                .lock()
                .await
                .log("INFO", &format!("心跳成功: {:?}", result.rows.len()));
            Ok(())
        } else {
            LOGIN_STATUS.store(false, Ordering::Relaxed);
            self.logger.lock().await.log("ERROR", "心跳失败");
            Err("心跳失败".into())
        }
    }
    async fn login(&self) -> Result<()> {
        if self.debug {
            self.log("INFO", "调试模式，跳过登录").await;
            return Ok(());
        }
        let response = self
            .client
            .post(format!("{}/login", self.base_url))
            .header(
                "Host",
                self.base_url
                    .to_string()
                    .replace("http://", "")
                    .replace("https://", ""),
            )
            .header("Referer", self.base_url.to_string())
            .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
            .body(format!(
                "type=password&username={}&password={}",
                self.username, self.password
            ))
            .send()
            .await?;

        if response.status().is_success() {
            LOGIN_STATUS.store(true, Ordering::Relaxed);
            self.logger.lock().await.log("INFO", "登录成功");
            Ok(())
        } else {
            LOGIN_STATUS.store(false, Ordering::Relaxed);
            self.logger
                .lock()
                .await
                .log("ERROR", &format!("登录失败: {:?}", response.text().await?));
            Err("登录失败".into())
        }
    }
    async fn query_project(&self, query_string: &str) -> Result<QueryResult> {
        let url = format!("{}/rest/inspect/query?{}", self.base_url, query_string);
        let response = self
            .client
            .get(&url)
            .header(
                "Host",
                self.base_url
                    .to_string()
                    .replace("http://", "")
                    .replace("https://", ""),
            )
            .header("Referer", self.base_url.to_string())
            .header(header::ACCEPT, "application/json")
            .send()
            .await?;

        let result: QueryResult = response.json().await?;
        Ok(result)
    }
    async fn get_project_id(&self, project_no: &str) -> Result<String> {
        let (start_date, end_date) = parse_date(project_no)?;
        let system_id = if project_no.starts_with("PEK") {
            "pek"
        } else {
            "sek"
        };

        let query_string = format!(
            "systemId={}&category=battery&projectNo={}&startDate={}&endDate={}&page=1&rows=10",
            system_id, project_no, start_date, end_date
        );
        let result: QueryResult = self.query_project(&query_string).await.unwrap();
        if result.rows.is_empty() {
            self.logger
                .lock()
                .await
                .log("ERROR", &format!("未找到项目ID: {:?}", query_string));
            return Err("未找到项目ID".into());
        }
        if result.rows[0].edit_status > 2 {
            self.logger.lock().await.log(
                "ERROR",
                &format!("没有权限修改: {:?}", result.rows[0].project_id),
            );
            return Err("没有权限修改".into());
        }
        Ok(result.rows[0].project_id.clone())
    }

    async fn post_file(
        &self,
        project_id: &str,
        file_id: &str,
        file_buffer: Vec<u8>,
        file_name: &str,
        file_type: &str, // 'goodsfile' 或 'batteryfile'
    ) -> Result<String> {
        let blob = multipart::Part::bytes(file_buffer).file_name(file_name.to_string());

        let dir = format!("project/{}/{}", project_id, file_type);
        let initial_preview = "[]";
        let initial_preview_config = "[]";
        let initial_preview_thumb_tags = "[]";

        let form = multipart::Form::new()
            .text("file", file_name.to_string())
            .text("fileId", file_id.to_string())
            .text("initialPreview", initial_preview.to_string())
            .text("initialPreviewConfig", initial_preview_config.to_string())
            .text(
                "initialPreviewThumbTags",
                initial_preview_thumb_tags.to_string(),
            )
            .text("dir", dir)
            .text("fileType", file_type.to_string())
            .text("typeId", project_id.to_string())
            .text("refesh", "true")
            .text("allowedFileTypes", "pdf")
            .text("checkpdf", "true")
            .part("file", blob);

        let url: String;
        if self.debug {
            url = format!("{}/rest/document/upload", "http://127.0.0.1:3000");
        } else {
            url = format!("{}/rest/document/upload", self.base_url);
        }
        let response = self.client.post(url).multipart(form).send().await?;

        if response.status().is_success() {
            self.logger.lock().await.log(
                "INFO",
                &format!("文件上传成功: {:?}", response.text().await?),
            );
            Ok(file_name.to_string())
        } else {
            self.logger.lock().await.log(
                "ERROR",
                &format!("文件上传失败，状态码: {:?}", response.status()),
            );
            Err("文件上传失败".into())
        }
    }

    async fn log(&self, level: &str, message: &str) {
        self.logger.lock().await.log(level, message);
    }
    async fn post_file_from_directory(&self, path: PathBuf) -> Vec<String> {
        self.log(
            "INFO",
            &format!("开始从 {} 上传文件", path.to_str().unwrap()),
        )
        .await;
        let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
        if !LOGIN_STATUS.load(Ordering::Relaxed) {
            popup_message(
                "登录失败",
                &format!(
                    "请先检查密码是否正确，日志中可能会有更多信息: 日志文件路径{:?}",
                    current_exe.parent().unwrap().join("logs")
                ),
            );
            return Vec::new();
        }
        let raw_file_info = match_file(&path);
        let message = build_confirmation_message(&raw_file_info);

        if !popup_message("警告", &message) {
            return Vec::new();
        }

        let mut uploaded_files = Vec::new();
        for file_info in raw_file_info {
            let result = self.process_single_file(file_info).await;
            if let Ok(file_name) = result {
                uploaded_files.push(file_name);
            }
        }
        self.log("INFO", &format!("上传的文件: {:?}", uploaded_files))
            .await;
        uploaded_files
    }

    async fn process_single_file(&self, file_info: RawFileInfo) -> Result<String> {
        let Some(file_info) = prepare_file_info(file_info) else {
            return Err("准备文件信息失败".into());
        };

        let project_id: String;
        if self.debug {
            project_id = "123456AAAAAAAAAAAAAAAA".to_string();
        } else {
            project_id = self.get_project_id(&file_info.project_no).await?;
        }

        self.post_file(
            &project_id,
            &file_info.file_id,
            file_info.file_buffer,
            &file_info.file_name,
            &file_info.file_type,
        )
        .await
    }

    async fn get_project_info(&self, project_no: &str) -> Result<QueryResult> {
        self.log("INFO", &format!("GET /get-project-info: {:?}", project_no))
            .await;
        let (start_date, end_date) = parse_date(&project_no).unwrap();
        let system_id = if project_no.starts_with("PEK") {
            "pek"
        } else {
            "sek"
        };

        let query_string = format!(
            "systemId={}&category=battery&projectNo={}&startDate={}&endDate={}&page=1&rows=10",
            system_id, project_no, start_date, end_date
        );
        let result = self.query_project(&query_string).await.unwrap();
        Ok(result)
    }
}

pub async fn run(
    base_url: String,
    username: String,
    password: String,
    port: String,
    debug: String,
    log_enabled: String,
) -> Result<()> {
    let client = Arc::new(Mutex::new(HttpClient::new(
        base_url.clone(),
        username.clone(),
        password.clone(),
        debug == "true",
        log_enabled == "true",
    )));
    client.lock().await.log("INFO", "开始运行").await;
    client.lock().await.log("INFO", &format!("base_url: {}", base_url)).await;
    client.lock().await.log("INFO", &format!("username: {}", username)).await;
    client.lock().await.log("INFO", &format!("password: {}", password)).await;
    client.lock().await.log("INFO", &format!("port: {}", port)).await;
    client.lock().await.log("INFO", &format!("debug: {}", debug)).await;
    client.lock().await.log("INFO", &format!("log_enabled: {}", log_enabled)).await;
    let _ = client.lock().await.login().await;
    let client_clone = client.clone();
    let _heartbeat = tokio::spawn(async move {
        loop {
            if debug == "false" {
                LOGIN_STATUS.store(false, Ordering::Relaxed);
                client_clone.lock().await.heartbeat().await.unwrap();
            } else {
                LOGIN_STATUS.store(true, Ordering::Relaxed);
                client_clone
                    .lock()
                    .await
                    .log("INFO", "调试模式，跳过心跳")
                    .await;
            }
            tokio::time::sleep(std::time::Duration::from_secs(60 * 28)).await;
        }
    });
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
                let response = if let Ok(result) = client.lock().await.get_project_info(&project_no).await {
                    warp::reply::json(&result)
                } else {
                    warp::reply::json(&CustomError {
                        message: "未找到项目ID".to_string(),
                    })
                };
                response
            },
        );

    let combined_routes = routes.or(doc_routes);
    // 启动 web 服务器
    let server = warp::serve(combined_routes).run(([127, 0, 0, 1], port.parse::<u16>().unwrap()));
    let _server_handle = tokio::spawn(server);

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
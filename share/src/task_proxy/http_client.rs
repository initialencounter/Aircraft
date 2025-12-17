use aircraft_types::{logger::LogMessage, others::QueryResult};
use chrono::Local;
use std::env;
use std::path::PathBuf;
use std::sync::mpsc::Sender;

use reqwest::header;
use reqwest::{multipart, Client};

use crate::utils::{
    build_confirmation_message, get_today_date, match_file, match_file_list, parse_date,
    prepare_file_info, RawFileInfo,
};

use std::sync::atomic::{AtomicBool, Ordering};

pub static LOGIN_STATUS: AtomicBool = AtomicBool::new(false);

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub struct HttpClient {
    pub client: Client,
    pub base_url: String,
    pub username: String,
    pub password: String,
    pub debug: bool,
    pub log_tx: Sender<LogMessage>,
    pub confirm_fn: fn(&str, &str) -> bool,
}

impl HttpClient {
    pub fn new(
        base_url: String,
        username: String,
        password: String,
        debug: bool,
        log_tx: Sender<LogMessage>,
        confirm_fn: fn(&str, &str) -> bool,
    ) -> Self {
        let client = Client::builder().cookie_store(true).build().unwrap();

        HttpClient {
            client,
            base_url,
            username,
            password,
            debug,
            log_tx,
            confirm_fn,
        }
    }
    pub async fn heartbeat(&self) -> Result<()> {
        let today_date = get_today_date();
        if let Ok(result) = self
            .query_project(&format!(
                "systemId=sek&startDate={}&endDate={}&page=1&rows=10",
                today_date, today_date
            ))
            .await
        {
            LOGIN_STATUS.store(true, Ordering::Relaxed);
            self.log("INFO", &format!("心跳成功: {:?}", result.rows.len()))
                .await;
            Ok(())
        } else {
            LOGIN_STATUS.store(false, Ordering::Relaxed);
            self.log("ERROR", "心跳失败").await;
            Err("心跳失败".into())
        }
    }
    pub async fn login(&self) -> Result<()> {
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
            self.log("INFO", "登录成功").await;
            Ok(())
        } else {
            LOGIN_STATUS.store(false, Ordering::Relaxed);
            self.log("ERROR", &format!("登录失败: {:?}", response.text().await?))
                .await;
            Err("登录失败".into())
        }
    }
    pub async fn query_project(&self, query_string: &str) -> Result<QueryResult> {
        let url = format!("{}/rest/inspect/query?{}", self.base_url, query_string);

        let response = match self
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
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                self.log("ERROR", &format!("请求失败: {}", e)).await;
                return Err(Box::new(e));
            }
        };

        if !response.status().is_success() {
            let error_msg = format!("服务器返回错误状态码: {}", response.status());
            self.log("ERROR", &error_msg).await;
            return Err(error_msg.into());
        }

        match response.json().await {
            Ok(result) => Ok(result),
            Err(e) => {
                self.log("ERROR", &format!("解析JSON失败: {}", e)).await;
                Err(Box::new(e))
            }
        }
    }
    pub async fn get_project_id(&self, project_no: &str) -> Result<String> {
        let (start_date, end_date) = parse_date(project_no)?;
        let system_id = project_no[0..3].to_lowercase();
        let query_string = format!(
            "systemId={}&category=&projectNo={}&startDate={}&endDate={}&page=1&rows=10",
            system_id, project_no, start_date, end_date
        );

        let result = self.query_project(&query_string).await?;

        if result.rows.is_empty() {
            self.log("ERROR", &format!("未找到项目ID: {:?}", query_string))
                .await;
            return Err("未找到项目ID".into());
        }
        if result.rows[0].edit_status > 2 {
            self.log(
                "ERROR",
                &format!("没有权限修改: {:?}", result.rows[0].project_id),
            )
            .await;
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
            .text("refresh", "true")
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
            self.log(
                "INFO",
                &format!("文件上传成功: {:?}", response.text().await?),
            )
            .await;
            Ok(file_name.to_string())
        } else {
            self.log(
                "ERROR",
                &format!("文件上传失败，状态码: {:?}", response.status()),
            )
            .await;
            Err("文件上传失败".into())
        }
    }

    pub async fn log(&self, level: &str, message: &str) {
        let current_time = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        self.log_tx
            .send(LogMessage {
                time_stamp: current_time,
                level: level.to_string(),
                message: message.to_string(),
            })
            .unwrap();
    }
    pub async fn post_file_from_directory(&self, path: PathBuf) -> Vec<String> {
        self.log(
            "INFO",
            &format!("开始从 {} 上传文件", path.to_str().unwrap()),
        )
        .await;
        let raw_file_info = match_file(&path);
        self.post_raw_file(raw_file_info).await
    }

    pub async fn post_file_from_file_list(&self, file_list: Vec<String>) -> Vec<String> {
        let raw_file_info = match_file_list(file_list);
        self.post_raw_file(raw_file_info).await
    }

    pub async fn post_raw_file(&self, raw_file_info: Vec<RawFileInfo>) -> Vec<String> {
        let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
        if !LOGIN_STATUS.load(Ordering::Relaxed) {
            (self.confirm_fn)(
                "登录失败",
                &format!(
                    "请先检查密码是否正确，日志中可能会有更多信息: 日志文件路径{:?}",
                    current_exe.parent().unwrap().join("logs")
                ),
            );
            return Vec::new();
        }

        let message = build_confirmation_message(&raw_file_info);

        if !(self.confirm_fn)("警告", &message) {
            return Vec::new();
        }

        let mut uploaded_files = Vec::new();
        let mut upload_failed_files = Vec::new();
        for file_info in &raw_file_info {
            match self.process_single_file(file_info).await {
                Ok(file_name) => uploaded_files.push(file_name),
                Err(e) => {
                    upload_failed_files.push(format!(
                        "文件 {} : {}",
                        file_info.file_name.clone(),
                        e.to_string()
                    ));
                }
            };
        }
        self.log("INFO", &format!("上传的文件: {:?}", uploaded_files))
            .await;
        if !upload_failed_files.is_empty() {
            let message = format!("以下文件上传失败：\n{}", upload_failed_files.join("\n"));
            (self.confirm_fn)("警告", &message);
        }
        uploaded_files
    }

    async fn process_single_file(&self, file_info: &RawFileInfo) -> Result<String> {
        let Some(file_info) = prepare_file_info(file_info) else {
            return Err("准备文件信息失败".into());
        };

        let project_id: String;
        if self.debug {
            project_id = "123456AAAAAAAAAAAAAAAA".to_string();
        } else {
            match self.get_project_id(&file_info.project_no).await {
                Ok(id) => project_id = id,
                Err(e) => {
                    return Err(e);
                }
            };
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

    pub async fn get_project_info(&self, project_no: &str) -> Result<QueryResult> {
        self.log("INFO", &format!("GET /get-project-info: {:?}", project_no))
            .await;

        // 处理日期解析错误
        let (start_date, end_date) =
            parse_date(&project_no).map_err(|e| format!("解析日期失败: {}", e))?;

        let system_id = project_no[0..3].to_lowercase();

        let query_string = format!(
            "systemId={}&category=&projectNo={}&startDate={}&endDate={}&page=1&rows=10",
            system_id, project_no, start_date, end_date
        );

        match self.query_project(&query_string).await {
            Ok(result) => Ok(result),
            Err(e) => {
                self.log("ERROR", &format!("查询项目失败: {}", e)).await;
                Err(format!("查询项目失败: {}", e).into())
            }
        }
    }
}

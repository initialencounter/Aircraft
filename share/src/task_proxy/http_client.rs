use aircraft_types::{
    logger::LogMessage,
    others::{CaptchaResponse, QueryResult},
};
use base64::engine::general_purpose;
use base64::Engine;
use chrono::Local;
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::RwLock;
use std::{env, sync::Arc};

use reqwest::header;
use reqwest::{multipart, Client};

use crate::utils::{
    build_confirmation_message, get_today_date, match_file, match_file_list, parse_date,
    prepare_file_info, RawFileInfo,
};

use std::sync::atomic::{AtomicBool, Ordering};

pub static LOGIN_STATUS: AtomicBool = AtomicBool::new(false);
pub static DEBUG_MODE: AtomicBool = AtomicBool::new(false);

const EMPTY_JSON_ARRAY: &str = "[]";
const ALLOWED_FILE_TYPES: &str = "pdf";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const DEBUG_HOST: &str = "http://127.0.0.1:3000";
const FAKE_IMAGE: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub struct HttpClient {
    pub client: Client,
    pub host: Arc<RwLock<String>>,
    pub log_tx: Sender<LogMessage>,
    pub confirm_fn: fn(&str, &str) -> bool,
}

impl HttpClient {
    pub fn new(
        base_url: String,
        log_tx: Sender<LogMessage>,
        confirm_fn: fn(&str, &str) -> bool,
    ) -> Self {
        let client = Client::builder().cookie_store(true).build().unwrap();
        let host = base_url
            .replace("http://", "")
            .replace("https://", "")
            .split('/')
            .next()
            .unwrap_or("")
            .to_string();
        HttpClient {
            client,
            host: Arc::new(RwLock::new(host)),
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

    pub async fn get_captcha(&self, base_url: String) -> Result<CaptchaResponse> {
        if DEBUG_MODE.load(Ordering::Relaxed) {
            self.log("INFO", "调试模式，返回假验证码").await;
            return Ok(CaptchaResponse {
              img: FAKE_IMAGE.to_string(),
            });
        }
        let host = base_url
            .replace("http://", "")
            .replace("https://", "")
            .split('/')
            .next()
            .unwrap_or("")
            .to_string();
        // 写入新的 host
        {
            let mut writer = self.host.write().unwrap();
            *writer = host.clone();
        }
        self.log("INFO", &format!("HOST: {}", &host)).await;
        let response = self
            .client
            .get(format!("https://{}/captcha/captchaImage", &host))
            .header("Host", &host)
            .header("Referer", format!("https://{}/login", &host))
            .header("User-Agent", USER_AGENT)
            .send()
            .await?;

        if response.status().is_success() {
            // 获取图片的字节数据
            let image_bytes = response.bytes().await?;
            // 转换为base64编码
            let base64_image = general_purpose::STANDARD.encode(&image_bytes);
            // 构建data URI (假设是PNG格式，也可能是JPEG)
            let img = format!("data:image/jpeg;base64,{}", base64_image);

            self.log("INFO", "获取验证码成功").await;
            Ok(CaptchaResponse { img })
        } else {
            self.log(
                "ERROR",
                &format!("获取验证码失败: {:?}", response.text().await?),
            )
            .await;
            Err("获取验证码失败".into())
        }
    }

    pub async fn login_with_captcha(
        &self,
        code: &str,
        username: &str,
        password: &str,
    ) -> Result<()> {
        self.log("INFO", &format!("username: {}", username)).await;
        self.log("INFO", &format!("password: {}", password)).await;

        let host = self.host.read().unwrap().clone();

        if DEBUG_MODE.load(Ordering::Relaxed) {
            self.log("INFO", "调试模式，跳过登录").await;
            LOGIN_STATUS.store(true, Ordering::Relaxed);
            return Ok(());
        }

        let response = self
            .client
            .post(format!("https://{}/login", &host))
            .header("Host", &host)
            .header("Referer", format!("https://{}/login", &host))
            .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
            .header("User-Agent", USER_AGENT)
            .body(format!(
                "type=password&username={}&password={}&rememberMe=true&validateCode={}",
                urlencoding::encode(username),
                urlencoding::encode(password),
                urlencoding::encode(code)
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
        let host = self.host.read().unwrap().clone();
        let url = format!("https://{}/rest/inspect/query?{}", &host, query_string);

        let response = match self
            .client
            .get(&url)
            .header("Host", &host)
            .header("Referer", format!("https://{}/inspect/query/main", &host))
            .header("User-Agent", USER_AGENT)
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
    pub async fn search_project_no(&self, project_no: &str) -> Result<(String, String)> {
        let (start_date, end_date) =
            parse_date(project_no).unwrap_or(("".to_string(), "".to_string()));
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
        Ok((
            result.rows[0].project_id.clone(),
            result.rows[0].category.clone(),
        ))
    }

    async fn post_file(
        &self,
        project_id: &str,
        file_id: &str,
        file_buffer: Vec<u8>,
        file_name: &str,
        file_type_raw: &str, // 'goodsfile' 或 'batteryfile'
        category: &str,
    ) -> Result<String> {
        // 常量定义
        let host = self.host.read().unwrap().clone();

        // 根据类别确定文件类型
        let file_type = if category == "sodium" || category == "battery" {
            file_type_raw.to_string()
        } else {
            "goodsfile".to_string()
        };

        // 构建文件路径和表单数据
        let dir = format!("project/{}/{}", project_id, file_type);
        let blob = multipart::Part::bytes(file_buffer).file_name(file_name.to_string());

        let form = multipart::Form::new()
            .text("file", file_name.to_string())
            .text("fileId", file_id.to_string())
            .text("initialPreview", EMPTY_JSON_ARRAY)
            .text("initialPreviewConfig", EMPTY_JSON_ARRAY)
            .text("initialPreviewThumbTags", EMPTY_JSON_ARRAY)
            .text("dir", dir.clone())
            .text("fileType", file_type.clone())
            .text("typeId", project_id.to_string())
            .text("refresh", "true")
            .text("allowedFileTypes", ALLOWED_FILE_TYPES)
            .text("checkpdf", "true")
            .part("file", blob);

        // 构建上传 URL
        let url = if DEBUG_MODE.load(Ordering::Relaxed) {
            format!("{}/rest/document/upload", DEBUG_HOST)
        } else {
            format!("https://{}/rest/document/upload", host)
        };

        // 构建 Referer header
        let referer = format!(
            "https://{}/document/multiupload?dir={}&fileType={}&typeId={}&refresh=true&allowedFileTypes={}&checkpdf=true",
            host, dir, file_type, project_id, ALLOWED_FILE_TYPES
        );

        // 发送请求
        let response = self
            .client
            .post(&url)
            .multipart(form)
            .header("Host", &host)
            .header("Referer", referer)
            .header("User-Agent", USER_AGENT)
            .send()
            .await?;

        // 处理响应
        let status = response.status();
        if status.is_success() {
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
        println!("上传热键触发，文件列表3: {:?}", file_list.clone());
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
        let category: String;
        if DEBUG_MODE.load(Ordering::Relaxed) {
            project_id = "123456AAAAAAAAAAAAAAAA".to_string();
            category = "battery".to_string();
        } else {
            match self.search_project_no(&file_info.project_no).await {
                Ok(project) => {
                    project_id = project.0;
                    category = project.1;
                }
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
            &category,
        )
        .await
    }

    pub async fn get_project_info(&self, project_no: &str) -> Result<QueryResult> {
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

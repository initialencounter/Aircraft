use aircraft_types::config::LLMConfig;
use aircraft_types::llm::{
    ChatRequest, ChatResponse, FileUploadResult, Message, PdfDeleteResult, ResponseFormat,
};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::multipart::Part;
use reqwest::{multipart, Client};
use std::error::Error;
use std::sync::Mutex;

use crate::config::ConfigManager;

const PARSE_PROMPT: &str = include_str!("parse_prompt.md");

fn extract_json(input: &str) -> Option<String> {
    // 定义起始和结束标记
    let start_tag = "```json";
    let end_tag = "```";

    // 查找起始标记位置
    let start = input.find(start_tag)? + start_tag.len();
    // 从起始位置后查找结束标记
    let end = input[start..].find(end_tag)? + start;

    // 截取并去除首尾空白
    Some(input[start..end].trim().to_string())
}

#[derive(Debug)]
pub struct FileManager {
    pub client: Client,
    pub base_url: Mutex<String>,
    pub api_key: Mutex<String>,
    pub model: Mutex<String>,
}
impl FileManager {
    pub fn new(config: LLMConfig) -> Self {
        let client = Client::new();
        Self {
            client,
            base_url: Mutex::new(config.base_url),
            api_key: Mutex::new(config.api_key),
            model: Mutex::new(config.model),
        }
    }

    pub fn reload(&self) {
        let config = ConfigManager::get_config().llm;
        *self.base_url.lock().unwrap() = config.base_url;
        *self.api_key.lock().unwrap() = config.api_key;
        *self.model.lock().unwrap() = config.model;
    }

    async fn upload(&self, file_path: &str) -> Result<String, Box<dyn Error>> {
        // 异步读取文件内容到字节数组
        let file_data = tokio::fs::read(file_path).await?;

        // 创建 Part 并设置文件名和 MIME 类型
        let file_part = Part::bytes(file_data)
            .file_name(file_path.to_string()) // Convert `file_path` to an owned `String`
            .mime_str("application/pdf")?;
        self.upload_part(file_part).await
    }

    pub async fn upload_u8(
        &self,
        filename: String,
        file_data: Vec<u8>,
    ) -> Result<String, Box<dyn Error>> {
        let file_part = reqwest::multipart::Part::bytes(file_data)
            .file_name(filename) // Convert `file_path` to an owned `String`
            .mime_str("application/pdf")
            .unwrap();
        self.upload_part(file_part).await
    }

    pub async fn upload_part(&self, file_part: Part) -> Result<String, Box<dyn Error>> {
        // 创建 multipart 表单
        let form = multipart::Form::new()
            .part("file", file_part)
            .text("purpose", "file-extract"); // 根据需求修改用途参数

        // 发送请求
        let response = self
            .client
            .post(&format!("{}/files", *&self.base_url.lock().unwrap()))
            .header(
                AUTHORIZATION,
                format!("Bearer {}", *&self.api_key.lock().unwrap()),
            )
            .multipart(form)
            .send()
            .await?;

        // 处理响应
        if response.status().is_success() {
            Ok(response.json::<FileUploadResult>().await?.id)
        } else {
            Err(format!("上传失败！{}", response.text().await?))?
        }
    }

    /// 使用 API 上传文件并获取 OCR 内容
    pub async fn get_u8_text(
        &self,
        filename: String,
        file_data: Vec<u8>,
    ) -> Result<String, Box<dyn Error>> {
        let file_id = self.upload_u8(filename, file_data).await?;
        let text = self.content(&file_id).await?;
        self.delete(&file_id).await?;
        Ok(text)
    }

    async fn delete(&self, file_id: &str) -> Result<PdfDeleteResult, Box<dyn Error>> {
        // 发送请求
        let response = self
            .client
            .delete(&format!(
                "{}/files/{}",
                *&self.base_url.lock().unwrap(),
                file_id
            ))
            .header(
                AUTHORIZATION,
                format!("Bearer {}", *&self.api_key.lock().unwrap()),
            )
            .send()
            .await
            .unwrap();

        // 处理响应
        if response.status().is_success() {
            Ok(response.json::<PdfDeleteResult>().await?)
        } else {
            Err(format!("删除失败！{}", response.text().await?))?
        }
    }
    async fn content(&self, file_id: &str) -> Result<String, Box<dyn Error>> {
        // 发送请求
        let response = self
            .client
            .get(&format!(
                "{}/files/{}/content",
                *&self.base_url.lock().unwrap(),
                file_id
            ))
            .header(
                AUTHORIZATION,
                format!("Bearer {}", *&self.api_key.lock().unwrap()),
            )
            .send()
            .await
            .unwrap();

        // 处理响应
        if response.status().is_success() {
            Ok(response.text().await?)
        } else {
            Err(format!("获取文件内容失败！{}", response.text().await?))?
        }
    }
    pub async fn get_file_content(&self, file_path: &str) -> Result<String, Box<dyn Error>> {
        let file_id = self.upload(file_path).await?;
        let result = self.content(&file_id).await?;
        self.delete(&file_id).await?;
        Ok(result)
    }

    pub async fn chat_with_ai(&self, file_list: Vec<String>) -> Result<String, Box<dyn Error>> {
        let mut file_content: Vec<String> = vec![];
        for file_path in file_list {
            let file_id = self.upload(&file_path).await?;
            let result = self.content(&file_id).await?;
            self.delete(&file_id).await?;
            file_content.push(result);
        }
        self.chat_with_ai_fast_and_cheap(file_content).await
    }

    pub async fn chat_with_ai_proxy(
        &self,
        file_parts: Vec<Part>,
    ) -> Result<String, Box<dyn Error>> {
        let mut file_content: Vec<String> = vec![];
        for part in file_parts {
            let file_id = self.upload_part(part).await?;
            let result = self.content(&file_id).await?;
            self.delete(&file_id).await?;
            file_content.push(result);
        }
        self.chat_with_ai_fast_and_cheap(file_content).await
    }

    pub async fn chat_with_ai_fast_and_cheap(
        &self,
        file_content: Vec<String>,
    ) -> Result<String, Box<dyn Error>> {
        // packages/validators/src/shared/types/attachment.ts
        let mut messages: Vec<Message> = vec![
            Message {
                content: PARSE_PROMPT.to_string(),
                role: "system".to_string(),
            },
        ];
        for content in file_content {
            messages.push(Message {
                content,
                role: "system".to_string(),
            });
        }
        let model = {
            let guard = self.model.lock().unwrap();
            guard.clone()
        };
        let payload = ChatRequest {
            messages,
            model,
            temperature: 0.3,
            response_format: ResponseFormat {
                response_format_type: "json_object".to_string(),
            },
        };
        let response = self
            .client
            .post(&format!(
                "{}/chat/completions",
                *&self.base_url.lock().unwrap()
            ))
            .header(
                AUTHORIZATION,
                format!("Bearer {}", *&self.api_key.lock().unwrap()),
            )
            .header(CONTENT_TYPE, "application/json")
            .body(serde_json::to_string(&payload)?)
            .send()
            .await
            .unwrap();
        // 处理响应
        if response.status().is_success() {
            let res: ChatResponse = response.json::<ChatResponse>().await?;
            match res.choices[0].message.clone() {
                Some(message) => match extract_json(&message.content) {
                    Some(json) => Ok(json),
                    None => Ok(message.content),
                },
                None => Err("chat/completions 提取 json 失败！".to_string())?,
            }
        } else {
            Err(format!(
                "chat/completions 请求失败！{}",
                response.text().await?
            ))?
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_upload_pdf_to_openai() {
        let base_url = "https://api.moonshot.cn/v1";
        let api_key = "sk-";
        let file_path = r#"C:\Users\29115\RustroverProjects\validators\ts\test.pdf"#;
        let model = "moonshot-v1-128k";
        let config = LLMConfig {
            base_url: base_url.to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
        };
        let manage = FileManager::new(config);
        // let result = manage.upload(file_path).unwrap();
        // println!("{:?}", result.clone());
        // println!("{:?}", manage.delete(&result));
        // manage.get_file_content("cv26m9supvnh8m4rmvh0");
        let file_list = vec![file_path.to_string()];
        let json = manage.chat_with_ai(file_list).await.unwrap();
        println!("json: {:?}", json);
    }
}

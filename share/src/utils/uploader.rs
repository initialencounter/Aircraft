use aircraft_types::config::LLMConfig;
use aircraft_types::llm::{ChatRequest, ChatResponse, Message, ResponseFormat};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
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

    pub async fn chat_with_ai(&self, file_content: Vec<String>) -> Result<String, Box<dyn Error>> {
        // packages/validators/src/shared/types/attachment.ts
        let mut messages: Vec<Message> = vec![Message {
            content: PARSE_PROMPT.to_string(),
            role: "system".to_string(),
        }];
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
    use pdf_parser::read::read_pdf_u8;
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
        let file_data_vec: Vec<u8> = std::fs::read(file_path).expect("Failed to read file");
        let file_content = read_pdf_u8(&file_data_vec).unwrap();
        let file_list = vec![file_content.text];
        let json = manage.chat_with_ai(file_list).await.unwrap();
        println!("json: {:?}", json);
    }
}

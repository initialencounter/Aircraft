use aircraft_types::llm::{ChatRequest, ChatResponse, Message, ResponseFormat, Thinking};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use std::error::Error;

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
}
impl FileManager {
    pub fn new() -> Self {
        let client = Client::new();
        Self { client }
    }

    pub async fn chat_with_ai(&self, file_content: Vec<String>) -> Result<String, Box<dyn Error>> {
        let config = ConfigManager::get_config().llm;
        // packages/validators/src/shared/types/attachment.ts
        let mut messages: Vec<Message> = vec![Message {
            content: PARSE_PROMPT.to_string(),
            role: "system".to_string(),
            reasoning_content: None,
        }];
        for content in file_content {
            messages.push(Message {
                content,
                role: "system".to_string(),
                reasoning_content: None,
            });
        }
        let payload = ChatRequest {
            messages,
            model: config.model,
            thinking: Thinking {
                thinking_type: if config.thinking.unwrap_or(false) {
                    "enabled".to_string()
                } else {
                    "disabled".to_string()
                },
            },
            temperature: 0.3,
            response_format: ResponseFormat {
                response_format_type: "json_object".to_string(),
            },
        };
        let response = self
            .client
            .post(&format!("{}/chat/completions", config.base_url))
            .header(AUTHORIZATION, format!("Bearer {}", config.api_key))
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
        let file_path = r#"C:\Users\29115\RustroverProjects\validators\ts\test.pdf"#;
        let manage = FileManager::new();
        let file_data_vec: Vec<u8> = std::fs::read(file_path).expect("Failed to read file");
        let file_content = read_pdf_u8(&file_data_vec).unwrap();
        let file_list = vec![file_content.text];
        let json = manage.chat_with_ai(file_list).await.unwrap();
        println!("json: {:?}", json);
    }

    #[test]
    async fn test_upload_pdf_to_openai_with_ocr() {
        for i in 1..=1 {
            let file_path = format!(
                r"C:\Users\29115\Documents\lims-test-data\decrypt\{}_extracted.md",
                i
            );
            let manage = FileManager::new();
            let file_content: String =
                std::fs::read_to_string(&file_path).expect("Failed to read file");
            let json: String = manage.chat_with_ai(vec![file_content]).await.unwrap();
            std::fs::write(
                format!(
                    r"C:\Users\29115\Documents\lims-test-data\decrypt\{}_extracted.json",
                    i
                ),
                json,
            )
            .unwrap();
        }
    }
}

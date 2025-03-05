use crate::types::LLMConfig;
use reqwest::header::AUTHORIZATION;
use reqwest::multipart::Part;
use reqwest::{multipart, Client};
use std::error::Error;

use serde::{Deserialize, Serialize};

/// FileUploadResult
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileUploadResult {
    pub bytes: i64,

    pub created_at: i64,

    pub filename: String,

    pub id: String,

    pub object: String,

    pub purpose: String,

    pub status: String,

    pub status_details: String,
}

/// PdfReadResult
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PdfReadResult {
    pub content: String,

    pub file_type: String,

    pub filename: String,

    pub title: String,

    #[serde(rename = "type")]
    pub content_type: String,
}

/// PdfDeleteResult
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PdfDeleteResult {
    pub deleted: bool,

    pub id: String,

    pub object: String,
}

/// ChatRequest
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub temperature: f64,
}

/// ChatResponse
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,

    pub created: i64,

    pub id: String,

    pub model: String,

    pub object: String,

    pub usage: Usage,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Choice {
    pub finish_reason: Option<String>,

    pub index: Option<i64>,

    pub message: Option<Message>,
}

/// Message
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Message {
    pub content: String,

    pub role: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Usage {
    pub completion_tokens: i64,

    pub prompt_tokens: i64,

    pub total_tokens: i64,
}

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

pub struct FileManager {
    pub client: Client,
    base_url: String,
    api_key: String,
    model: String,
}
impl FileManager {
    pub fn new(config: LLMConfig) -> Self {
        let client = Client::new();
        Self {
            client,
            base_url: config.base_url,
            api_key: config.api_key,
            model: config.model,
        }
    }

    pub fn reload(&mut self, config: LLMConfig) {
        self.base_url = config.base_url;
        self.api_key = config.api_key;
        self.model = config.model;
    }

    async fn upload(&self, file_path: &str) -> Result<String, Box<dyn Error>> {
        // 异步读取文件内容到字节数组
        let file_data = tokio::fs::read(file_path).await?;

        // 创建 Part 并设置文件名和 MIME 类型
        let file_part = Part::bytes(file_data)
            .file_name(file_path.to_string()) // Convert `file_path` to an owned `String`
            .mime_str("application/pdf")?;
        // 创建 multipart 表单
        let form = multipart::Form::new()
            .part("file", file_part)
            .text("purpose", "file-extract"); // 根据需求修改用途参数

        // 发送请求
        let response = self
            .client
            .post(&format!("{}/files", &self.base_url))
            .header(AUTHORIZATION, format!("Bearer {}", &self.api_key))
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
    async fn delete(&self, file_id: &str) -> Result<PdfDeleteResult, Box<dyn Error>> {
        // 发送请求
        let response = self
            .client
            .delete(&format!("{}/files/{}", &self.base_url, file_id))
            .header(AUTHORIZATION, format!("Bearer {}", &self.api_key))
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
            .get(&format!("{}/files/{}/content", &self.base_url, file_id))
            .header(AUTHORIZATION, format!("Bearer {}", &self.api_key))
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
        let mut messages: Vec<Message> = vec![
            Message {
                content: r#"你是一个人工智能助手，主要负责帮助用户处理锂电池的测试报告，并输出结构化信息(JSON 字符串)，你需要保证输出的信息全都来自于用户提供的文件信息，如果用户提供的文件中不存在某个信息，则用null代替。结构化信息的类型是这样的：\`\`\`
Typescript
export interface PekData {
    /**
     * 委托方中文名称
     */
    appraiserCName: string
    /**
     * 委托方英文名称
     */
    appraiserEName: string
    /**
     * 制造商或生产工厂中文名称
     */
    manufacturerCName: string
    /**
     * 制造商或生产工厂英文名称
     */
    manufacturerEName: string
    /**
     * 电池中文名称
     */
    itemCName: string
    /**
     * 电池英文名称
     */
    itemEName: string
    /**
     * 电池颜色
     */
    color: string
    /**
     * 电池形状
     */
    shape: string
    /**
     * 电池尺寸
     */
    size: string
    /**
     * 电池型号
     */
    model: string
    /**
     * 电池商标
     */
    brands: string
    /**
     * 电池数量
     */
    btyCount: string
    /**
     * 电池净重
     */
    netWeight: string
    /**
     * 电池电压
     */
    inspectionItem2Text1: string
    /**
     * 电池容量
     */
    inspectionItem2Text2: string
    /**
     * 电池瓦时
     */
    inspectionItem3Text1: string
    /**
     * UN38.3报告编号
     */
    market: string
}\`\`\`\n注意：只输出 JSON 字符串，如果包含其他无关的字符串将导致json解析失败, 也不要用\`\`\`json来包裹json文本，因为你的输出要直接输入到JSON.parse"#.to_string(),
                role: "system".to_string(),
            },
        ];
        for file_path in file_list {
            let file_id = self.upload(&file_path).await?;
            let result = self.content(&file_id).await?;
            self.delete(&file_id).await?;
            messages.push(Message {
                content: result,
                role: "system".to_string(),
            });
        }
        let payload = ChatRequest {
            messages,
            model: self.model.clone(),
            temperature: 0.3,
        };
        let response = self
            .client
            .post(&format!("{}/chat/completions", &self.base_url))
            .header(AUTHORIZATION, format!("Bearer {}", &self.api_key))
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
                    None => Err("解析文件内容失败！".to_string())?,
                },
                None => Err("获取文件内容失败！".to_string())?,
            }
        } else {
            Err(format!("获取文件内容失败！{}", response.text().await?))?
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

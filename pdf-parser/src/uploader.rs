use crate::types::LLMConfig;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
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
    pub response_format: ResponseFormat,
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResponseFormat {
    #[serde(rename = "type")]
    pub response_format_type: String,
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

#[derive(Debug, Clone)]
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
        self.upload_part(file_part).await
    }

    pub async fn upload_u8(&self, filename: String, file_data: Vec<u8>) -> Result<String, Box<dyn Error>> {
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

    pub async fn get_u8_text(&self, filename: String, file_data: Vec<u8>) -> Result<String, Box<dyn Error>> {
        let file_id = self.upload_u8(filename, file_data).await?;
        let text = self.content(&file_id).await?;
        self.delete(&file_id).await?;
        Ok(text)
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
        let mut messages: Vec<Message> = vec![
            Message {
                content: r#"你是一个人工智能助手，你的输出结果不是直接面向用户的，你的工作只是工作流的其中一环，
主要负责帮助用户处理锂电池的UN38.3测试报告，出具UN38.3测试概要（报告是通过OCR或pdf解析技术提取的纯文本，将会在稍后提供），
并输出结构化信息(JSON 字符串)，你需要保证输出的信息全都来自于用户提供的文件信息，
如果用户提供的文件中不存在某个信息，则用null代替（所有信息必需要是能在报告中找到明确的存在的事实，禁止编造报告中不存在的信息，宁缺毋滥！！！）。

结构化信息的Typescript类型是这样的：
\`\`\`
Typescript
// UN38.3测试概要
// 以下信息需要你从UN38.3报告中提取, 请确保提取的信息准确无误（所有信息必需要是能在报告中找到明确的存在的事实，禁止编造报告中不存在的信息，宁缺毋滥！！！）

export interface SummaryFromLLM {
    /**制造商或生产工厂中文名称*/
    manufacturerCName: string | null
  
    /**制造商或生产工厂英文名称*/
    manufacturerEName: string | null
  
    /**测试单位 Test Lab*/
    testLab: string | null
  
    /**电池中文名称*/
    cnName: string | null
  
    /**电池英文名称*/
    enName: string | null
  
    /**电池类型
     * 锂离子电芯：不含电路保护板的单电芯电池，判断方法：T1的测试数量为10个，T7为不适用
     * 单电芯锂离子电池：含电路保护板单电芯电池，判断方法：T1的测试数量为10个,电芯的组合方式为1S1P
     * 锂离子电池：多个电芯组成的电池，判断方法：T1的测试数量为8个或4个
     * 锂金属电芯：单电芯锂金属电池，判断方法：T1的测试数量为10个，T7为不适用
     * 锂金属电池：多个电芯组成的锂金属电池，判断方法：T7为不适用，T1的测试数量为8个或4个
    */
    classification:
    "锂离子电池" |
    "锂离子电芯" |
    "锂金属电池" |
    "锂金属电芯" |
    "单电芯锂离子电池" |
    "单电芯锂金属电池" | null
  
    /**电池型号*/
    type: string | null
  
    /**电池商标*/
    trademark: string | null
  
    /**电池电压，单位：V*/
    voltage: number | null
  
    /**电池容量，单位：mAh*/
    capacity: number | null
  
    /**电池瓦时，单位：Wh
     * 如果是锂金属电池则无需填写
    */
    watt: number | null
  
    /**电池颜色*/
    color: string | null
  
    /**电池形状*/
    shape: string | null
  
    /**电池尺寸*/
    size: string | null
  
    /**单块电池质量，单位：g
     * 如果报告中没有写明，则需要从T1原始数据中取一个平均值或最大值
    */
    mass: number | null
  
    /**锂含量，单位：g
     * 如果是锂离子电池则无需填写
    */
    licontent: number | null
  
    /**UN38.3测试报告编号*/
    testReportNo: string | null
  
    /** UN38.3测试报告签发日期签发日期
     * 格式为：yyyy-MM-dd，如果日期为2021.01.01，则填需要转为2021-01-01
    */
    testDate: string | null
  
    /** UN38.3测试报告测试标准或试验依据Test Method
     * 版本号和修订号有区别的，不要弄错了
     * 没有修订号的，不要写修订号，这个经常容易弄错，请仔细核对
    */
    testManual: 
    "第8版" |
    "第7版修订1" |
    "第7版" |
    "第6版修订1" |
    "第6版" |
    "第5版修订1和修订2" |
    "第5版修订1" |
    "第5版" |
    "第4版" | null
  
    /**
     * T.1：高度模拟 Altitude Simulation(通过true, 不适用/未通过false)
     */
    test1: boolean;
  
    /**T.2：温度试验 Thermal Test*/
    test2: boolean;
  
    /**T.3：振动 Vibration*/
    test3: boolean;
  
    /**T.4：冲击 Shock*/
    test4: boolean;
  
    /**T.5：外部短路 External Short Circuit*/
    test5: boolean;
  
    /**T.6：撞击/挤压 Impact/Crush */
    test6: boolean;
  
    /**T.7：过度充电 vercharge*/
    test7: boolean;
  
    /**T.8：T.8：强制放电 Forced Discharge*/
    test8: boolean;
  }
  
\`\`\`
注意：只输出 JSON 字符串，如果包含其他无关的字符串将导致json解析失败, 也不要用\`\`\`json来包裹json文本
因为你的输出要直接输入到JSON.parse，再次强调：所有信息必需要是能在报告中找到明确的存在的事实，禁止编造报告中不存在的信息，宁缺毋滥！！！
"#.to_string(),
                role: "system".to_string(),
            },
        ];
        for content in file_content {
            messages.push(Message {
                content,
                role: "system".to_string(),
            });
        }
        let payload = ChatRequest {
            messages,
            model: self.model.clone(),
            temperature: 0.3,
            response_format: ResponseFormat {
                response_format_type: "json_object".to_string(),
            }
        };
        let response = self
            .client
            .post(&format!("{}/chat/completions", &self.base_url))
            .header(AUTHORIZATION, format!("Bearer {}", &self.api_key))
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
            Err(format!("chat/completions 请求失败！{}", response.text().await?))?
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

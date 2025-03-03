use serde::{Serialize, Deserialize};


#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoodsInfo {
    pub project_no: String,
    pub name: String,
    pub labels: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

impl LLMConfig {
    pub fn default() -> Self {
        LLMConfig {
            base_url: "https://api.moonshot.cn/v1".to_string(),
            api_key: "".to_string(),
            model: "moonshot-v1-128k".to_string(),
        }
    }
}

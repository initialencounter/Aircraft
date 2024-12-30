use std::time::SystemTime;
use std::sync::mpsc::Sender;
use chrono::Local;
use serde::{Deserialize, Serialize};
use summary_rs::{parse_docx_table, parse_docx_text, read_docx_content, SummaryModelDocx};

use crate::hotkey::copy::search;
use crate::hotkey::SearchResult;
use crate::logger::LogMessage;
use crate::pdf::parse::parse_good_file;
use crate::pdf::read::read_pdf;
use crate::pdf::types::GoodsInfo;
use crate::yolov8::detect_objects_on_image;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub async fn get_summary_info(project_no: String) -> Result<SummaryModelDocx> {
    let path = get_summary_path(project_no).await?;
    let document_xml = match read_docx_content(&path, vec!["word/document.xml".to_string()]) {
        Ok(document_xml) => document_xml,
        Err(e) => return Err(format!("读取文档失败: {}", e).into()),
    };
    let content = parse_docx_text(&document_xml[0]);
    let project_info = parse_docx_table(content);
    return Ok(project_info);
}

pub async fn filter_file(extension: &str, search_result: Vec<SearchResult>) -> Result<Vec<String>> {
    let mut file_list = vec![];
    for result in search_result {
        let source_path = format!("{}\\{}", result.path, result.name);
        if result.name.is_empty() {
            continue;
        }
        if result.name.ends_with(extension) {
            file_list.push(source_path);
        }
    }
    Ok(file_list)
}
pub async fn get_summary_path(project_no: String) -> Result<String> {
    let search_result = search(project_no.clone()).await;
    let file_list = filter_file(".docx", search_result).await?;
    if file_list.is_empty() {
        return Err(format!("未找到项目: {}", project_no).into());
    }
    return Ok(file_list[0].clone());
}

pub async fn get_goods_path(project_no: String) -> Result<String> {
    let search_result = search(project_no.clone()).await;
    let file_list = filter_file(format!("{}.pdf", project_no).as_str(), search_result).await?;
    if file_list.is_empty() {
        return Err(format!("未找到项目: {}", project_no).into());
    }
    return Ok(file_list[0].clone());
}

pub async fn get_goods_info(project_no: String, log_tx: Sender<LogMessage>) -> Result<GoodsInfo> {
    let path = get_goods_path(project_no).await?;
    let result = read_pdf(&path)?;
    let goods_pdf = parse_good_file(result.text)?;
    let labels = detect_goods_pdf(result.images, log_tx).await;
    return Ok(GoodsInfo {
        project_no: goods_pdf.project_no,
        name: goods_pdf.item_c_name,
        labels,
    });
}

// const LABEL_SET: [&str; 8] = ["9A", "3480", "CAO", "3481", "UN spec", "Blur", "9", "3091"];
const BTY_SET: [&str; 4] = ["3480", "3481", "3091", "Blur"];

pub async fn detect_goods_pdf(images: Vec<Vec<u8>>, log_tx: Sender<LogMessage>) -> Vec<String> {
    let now = SystemTime::now();
    let mut labels = vec![];
    for (_, image) in images.iter().enumerate() {
        let text = detect_objects_on_image(image.clone());
        if text.is_empty() {
            continue;
        }
        for (_, label) in text.iter().enumerate() {
            if label[4] == "UN spec".to_string() {
                continue;
            }
            if BTY_SET.contains(&(label[4].as_str())) {
                labels.push("bty".to_string());
                continue;
            }
            labels.push(label[4].clone());
        }
    }
    let _ = log_tx.send(LogMessage {
        time_stamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        level: "INFO".to_string(),
        message: format!("检测{}个图片，用时{}s", images.len(), now.elapsed().unwrap().as_secs_f32()),
    });
    return labels;
}


#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub summary: SummaryModelDocx,
    pub goods: GoodsInfo,
}

pub async fn get_attachment_info(project_no: String, log_tx: Sender<LogMessage>) -> Result<AttachmentInfo> {
    let summary = get_summary_info(project_no.clone()).await?;
    let goods_info = get_goods_info(project_no.clone(), log_tx).await?;
    return Ok(AttachmentInfo { summary, goods: goods_info });
}
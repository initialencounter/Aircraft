use napi_derive::napi;
use serde::{Deserialize, Serialize};

use crate::hotkey_handler::copy::{search, SearchResult};
use crate::pdf_parser::parse::parse_good_file;
use crate::pdf_parser::read::read_pdf;
use crate::pdf_parser::types::GoodsInfo;
use crate::summary_rs::{parse_docx_table, parse_docx_text, read_docx_content, SummaryInfo};
use crate::utils::get_file_names;
// use crate::yolov8::detect_objects_on_image;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub async fn get_summary_info(project_no: String) -> Result<SummaryInfo> {
    let path = get_summary_path(project_no).await?;
    let document_xml = match read_docx_content(&path, vec!["word/document.xml".to_string()]) {
        Ok(document_xml) => document_xml,
        Err(e) => return Err(format!("读取文档失败: {}", e).into()),
    };
    let content = parse_docx_text(&document_xml[0]);
    let project_info = parse_docx_table(content);
    Ok(project_info)
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
    Ok(file_list[0].clone())
}

pub async fn get_goods_path(project_no: String) -> Result<String> {
    let search_result = search(project_no.clone()).await;
    let file_list = filter_file(format!("{}.pdf", project_no).as_str(), search_result).await?;
    if file_list.is_empty() {
        return Err(format!("未找到项目: {}", project_no).into());
    }
    Ok(file_list[0].clone())
}

pub async fn get_goods_info(
    project_no: String,
    required_image: bool,
    is_965: bool,
) -> Result<GoodsInfo> {
    let path = get_goods_path(project_no).await?;
    let result = read_pdf(&path, required_image)?;
    let goods_info = parse_good_file(result.text, is_965)?;
    Ok(goods_info)
}


#[napi(object)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtherInfo {
    pub stack_evaluation: bool,
    pub project_dir: String,
}

pub async fn find_stack_evaluation(project_dir: String)-> bool {
    let file_name_list = get_file_names(&std::path::PathBuf::from(&project_dir)).unwrap_or(vec![]);
    for file_name in file_name_list {
        if file_name.contains("评估单") {
            return true;
        }
    }
    return false;
}

pub async fn get_other_info(project_no: String) -> Result<OtherInfo> {
    let search_result = search(project_no).await;
    let project_dir = if let Some(first_result) = search_result.first() {
        first_result.path.clone()
    } else {
        return Ok(OtherInfo {
        stack_evaluation: false,
        project_dir: "null".to_string(),
    });
    };
    Ok(OtherInfo {
        stack_evaluation: find_stack_evaluation(project_dir.clone()).await,
        project_dir: project_dir.clone(),
    })
}

#[napi(object)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub summary: SummaryInfo,
    pub goods: GoodsInfo,
    pub other: OtherInfo,
}

pub async fn get_attachment_info(
    project_no: String,
    required_image: bool,
    is_965: bool,
) -> Result<AttachmentInfo> {
    Ok(AttachmentInfo {
        summary: get_summary_info(project_no.clone()).await?,
        goods: get_goods_info(project_no.clone(), required_image, is_965).await?,
        other: get_other_info(project_no.clone()).await?,
    })
}

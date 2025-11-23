use crate::hotkey_handler::copy::search;
use crate::utils::get_file_names;
use aircraft_types::{
    attachment::{AttachmentInfo, OtherInfo},
    others::SearchResult,
    summary::SummaryInfo,
};
use pdf_parser::parse::parse_good_file;
use pdf_parser::read::read_pdf;
use pdf_parser::GoodsInfo;
use summary::{parse_docx_table, parse_docx_text, read_docx_content};

#[cfg(not(feature = "napi-support"))]
use yolo::segment::detect_objects_on_image;

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
        return Err(format!("未找到概要路径: {}", project_no).into());
    }
    Ok(file_list[0].clone())
}

pub async fn get_goods_path(project_no: String) -> Result<String> {
    let search_result = search(project_no.clone()).await;
    let file_list = filter_file(format!("{}.pdf", project_no).as_str(), search_result).await?;
    if file_list.is_empty() {
        return Err(format!("未找到图片路径: {}", project_no).into());
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
    #[cfg(not(feature = "napi-support"))]
    {
        let mut goods_info = parse_good_file(result.text, is_965, None)?;
        if required_image {
            if let Some(images) = result.images {
                let segment_result = detect_objects_on_image(images.clone());
                let mut labels = vec![];
                for result in &segment_result {
                    if result.confidence > 0.5 {
                        labels.push(result.label.clone());
                    }
                }
                goods_info.labels = labels;
                goods_info.segment_results = segment_result;
                goods_info.package_image = Some(images);
            }
        }
        Ok(goods_info)
    }
    #[cfg(feature = "napi-support")]
    {
        let goods_info = parse_good_file(result.text, is_965, None)?;
        Ok(goods_info)
    }
}

pub async fn find_stack_evaluation(project_dir: String) -> bool {
    let file_name_list = get_file_names(&std::path::PathBuf::from(&project_dir)).unwrap_or(vec![]);
    for file_name in file_name_list {
        if file_name.contains("评估单") {
            return true;
        }
        if file_name.contains("堆码评估") {
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

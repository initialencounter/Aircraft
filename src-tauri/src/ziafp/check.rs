use crate::hotkey::copy::search;
use summary_rs::{parse_docx_table, parse_docx_text, read_docx_content, SummaryModelDocx};

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

pub async fn get_summary_path(project_no: String) -> Result<String> {
    let search_result = search(project_no.clone()).await;
    let mut file_list = vec![];
    for result in search_result {
        let source_path = format!("{}\\{}", result.path, result.name);
        if result.name.is_empty() {
            continue;
        }
        if result.name.ends_with(".docx") {
            file_list.push(source_path);
        }
    }
    if file_list.is_empty() {
        return Err(format!("未找到项目: {}", project_no).into());
    }
    return Ok(file_list[0].clone());
}

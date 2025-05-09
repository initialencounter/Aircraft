use std::fs::File;
use std::io::Read;

use zip::ZipArchive;

use crate::summary_rs::{parse_docx_table, parse_docx_text};

use super::SummaryInfo;

pub fn read_docx_content(input_path: &str, names: Vec<String>) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    // 先将整个文件读入内存
    let mut file_content = Vec::new();
    File::open(input_path)?.read_to_end(&mut file_content)?;

    // 从内存中读取zip文件
    let mut archive = ZipArchive::new(std::io::Cursor::new(&file_content))?;
    let mut content = Vec::new();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if names.contains(&name) {
            let mut content_string = String::new();
            file.read_to_string(&mut content_string)?;
            content.push(content_string);
        }
    }

    Ok(content)
}

pub fn read_docx_content_u8(file_content: Vec<u8>, names: Vec<String>) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    // 从内存中读取zip文件
    let mut archive = ZipArchive::new(std::io::Cursor::new(&file_content))?;
    let mut content = Vec::new();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if names.contains(&name) {
            let mut content_string = String::new();
            file.read_to_string(&mut content_string)?;
            content.push(content_string);
        }
    }

    Ok(content)
}

fn get_summary_info(contents: Vec<String>) -> Result<SummaryInfo, Box<dyn std::error::Error>> {
    let content = parse_docx_text(&contents[0]);
    let summary = parse_docx_table(content);
    Ok(summary)
}

pub fn get_summary_info_by_path(path: &str) -> Result<SummaryInfo, Box<dyn std::error::Error>> {
    let contents = read_docx_content(path, vec!["word/document.xml".to_string()])?;
    get_summary_info(contents)
}

pub fn get_summary_info_by_buffer(buffer: Vec<u8>) -> Result<SummaryInfo, Box<dyn std::error::Error>> {
  let contents = read_docx_content_u8(buffer, vec!["word/document.xml".to_string()])?;
  get_summary_info(contents)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = read_docx_content(
            r"C:\Users\29115\RustroverProjects\Aircraft\summary-rs\11.docx",
            vec!["word/document.xml".to_string()]);
        assert!(result.is_ok());
        std::fs::write("test2.json", result.unwrap()[0].clone()).unwrap();
    }
}

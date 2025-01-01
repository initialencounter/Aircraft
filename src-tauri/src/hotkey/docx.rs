use crate::utils::popup_message;
use lazy_static::lazy_static;
use regex::Regex;
use serde::Deserialize;
use serde::Serialize;
use std::env;
use std::fs;
use std::path::PathBuf;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

lazy_static! {
    static ref RE_IMAGE_EXTENT: Regex = Regex::new(r#"cx="(\d+)" cy="(\d+)""#).unwrap();
    static ref RE_IMAGE_BEHIND_DOCUMENT: Regex = Regex::new(r#"behindDoc="(\d)""#).unwrap();
}

#[derive(Deserialize, Serialize)]
struct QueryResult {
    rows: Vec<ProjectRow>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRow {
    item_c_name: String,
    item_e_name: String,
    edit_status: i64,
    project_id: String,
    project_no: String,
}

#[derive(Deserialize, Serialize)]
struct EditDocResponse {
    message: String,
    save_path: String,
}

use std::fs::File;
use std::io::{Read, Write};
use zip::write::{ExtendedFileOptions, FileOptions};
use zip::{ZipArchive, ZipWriter};

fn get_signature_path() -> Result<String> {
    let exe_path = env::current_exe()?;
    let parent_path = exe_path.parent().ok_or("无法获取父目录")?;
    let signature_path_buf = parent_path.join("signature.png");
    let signature_path = signature_path_buf.to_str().ok_or("路径转换失败")?;
    Ok(signature_path.to_string())
}
fn read_file_to_buffer(file_path: &str) -> Result<Vec<u8>> {
    let mut file_content = Vec::new();
    File::open(PathBuf::from(file_path))?.read_to_end(&mut file_content)?;
    Ok(file_content)
}

fn change_title(content: String) -> String {
    let title = "锂电池/钠离子电池UN38.3试验概要";
    let content = content.replace("锂电池UN38.3试验概要", title);
    let content = content.replace("Lithium Battery Test Summary", "Test Summary");
    content.to_string()
}

fn change_test_info(content: String, inspector: &str) -> String {
    let mut content = content.replacen("UN38.3.3(f)", "UN38.3.3.1(f)或/or\nUN38.3.3.2(d)", 1);
    content = content.replace("UN38.3.3(g)", "UN38.3.3.1(g) 或/or UN38.3.3.2(e)");
    content = content.replacen("UN38.3.3.1(f)", "dXNlIHN0ZDo6ZnM6OkZpbGU7CnVzZS1", 1);
    content = content.replacen("UN38.3.3.2(d)", "dXNlIHN0ZDo6ZnM6OkZpbGU7CnVzZS2", 1);
    content = content.replacen("UN38.3.3.1(f)", "UN38.3.3.1(g) ", 1);
    content = content.replacen("UN38.3.3.2(d)", "UN38.3.3.2(e)", 1);
    content = content.replace("dXNlIHN0ZDo6ZnM6OkZpbGU7CnVzZS1", "UN38.3.3.1(f)");
    content = content.replace("dXNlIHN0ZDo6ZnM6OkZpbGU7CnVzZS2", "UN38.3.3.2(d)");
    if !content.contains("Inspector") {
        content = content.replace("检验员", &format!("检验员Inspector：{}", inspector));
    }
    content.to_string()
}

fn set_image_size(content: String, width: f32, height: f32) -> Result<String> {
    let x = (width * 360000.0) as i32;
    let y = (height * 360000.0) as i32;
    let wp_extent = format!("cx=\"{}\" cy=\"{}\"", x, y);
    let content = RE_IMAGE_EXTENT.replace_all(&content, &wp_extent);
    Ok(content.to_string())
}

fn set_image_behind_document(content: String) -> Result<String> {
    let behind_doc = "behindDoc=\"1\"";
    let content = RE_IMAGE_BEHIND_DOCUMENT.replace_all(&content, &behind_doc.to_string());
    Ok(content.to_string())
}

fn set_page_margins(content: String) -> Result<String> {
    let re = Regex::new(r#"<w:pgMar[^>]+/>"#).unwrap();
    
    // 设置页边距为2厘米
    // 2厘米 ≈ 1134 twips (567 * 2)
    let new_margins = r#"<w:pgMar w:top="1134" w:right="1230" w:bottom="567" w:left="1230" w:header="851" w:footer="992" w:gutter="0"/>"#;
    
    let content = re.replace_all(&content, new_margins);
    Ok(content.to_string())
}

fn match_table_cell_width(regex: &Regex, content: &str) -> Result<Vec<i32>> {
    let captures: Vec<i32> = regex.captures_iter(content)
    .filter_map(|cap| {
        println!("{:?}", cap);
        cap[1].parse::<i32>().ok()})
    .collect();
    if captures.is_empty() {
        return Ok(vec![0,0,0]);
    }
    Ok(captures)
}

fn set_specific_table_cell_width(content: String) -> Result<String> {
    println!("{}", content);
    let last_3_table_cell_start = match content.find("签名Signatory") {
        Some(pos) => pos,
        None => return Ok(content),
    };
    let last_3_table_cell_xml = &content[last_3_table_cell_start..];
    let tmp_last_3_table_cell_xml = last_3_table_cell_xml.to_string();
    println!("{}", last_3_table_cell_xml);
    let size_regex = Regex::new(r#"<w:tcW w:w="(\d+)" w:type="dxa""#).unwrap();
    // 提取原始大小
    let sizes = match_table_cell_width(&size_regex, last_3_table_cell_xml)?;
    let size1_value = sizes[0];
    let size2_value = sizes[1];
    let size3_value = sizes[2];
    // 计算总和
    let total_size = size1_value + size2_value + size3_value;

    // 按比例重新分配大小
    let new_size1 = (total_size * 5 / 7) as i32; // 5/7
    let new_size2 = (total_size * 1 / 7) as i32; // 1/7
    let new_size3 = (total_size * 1 / 7) as i32; // 1/7
    println!("{}", new_size1);
    println!("{}", new_size2);
    println!("{}", new_size3);
    // // 替换原来的大小
    let new_last_3_table_cell_xml = last_3_table_cell_xml.replace(size1_value.to_string().as_str(), new_size1.to_string().as_str());
    let new_last_3_table_cell_xml = new_last_3_table_cell_xml.replace(size2_value.to_string().as_str(), new_size2.to_string().as_str());
    let new_last_3_table_cell_xml = new_last_3_table_cell_xml.replace(size3_value.to_string().as_str(), new_size3.to_string().as_str());
    let content = content.replace(&tmp_last_3_table_cell_xml, &new_last_3_table_cell_xml);
    Ok(content.to_string())
}

pub fn modify_docx(input_path: &str, inspector: &str, width: f32, height: f32) -> Result<()> {
    // 先将整个文件读入内存
    let mut file_content = Vec::new();
    File::open(input_path)?.read_to_end(&mut file_content)?;

    // 从内存中读取zip文件
    let mut archive = ZipArchive::new(std::io::Cursor::new(&file_content))?;

    // 创建新的内存缓冲区用于存储修改后的文件
    let mut output_buffer = Vec::new();
    let mut zip_writer = ZipWriter::new(std::io::Cursor::new(&mut output_buffer));

    // 复制所有文件，修改document.xml
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();

        if name == "word/document.xml" {
            let mut content = String::new();
            file.read_to_string(&mut content)?;
            content = change_title(content);
            content = change_test_info(content, inspector);
            content = set_image_size(content, width, height)?;
            content = set_image_behind_document(content)?;
            content = set_page_margins(content)?;
            // content = set_specific_table_cell_width(content)?;
            zip_writer.start_file::<String, ExtendedFileOptions>(name, FileOptions::default())?;
            zip_writer.write_all(content.as_bytes())?;
        } else if name == "word/media/image1.png" {
            let signature_path = match get_signature_path() {
                Ok(path) => path,
                Err(_) => {
                    println!("无法获取签名路径");
                    continue;
                },
            };
            let buffer = read_file_to_buffer(&signature_path)?;
            zip_writer.start_file::<String, ExtendedFileOptions>(name, FileOptions::default())?;
            zip_writer.write_all(&buffer)?;
        } else {
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)?;
            zip_writer.start_file::<String, ExtendedFileOptions>(name, FileOptions::default())?;
            zip_writer.write_all(&buffer)?;
        }
    }

    zip_writer.finish()?;

    // 直接写入原文件
    let mut output_file = File::create(input_path)?;
    match output_file.write_all(&output_buffer) {
        Ok(_) => {
            println!("修改成功");
        },
        Err(e) => {
            println!("无法写入文件: {}", e);
        },
    };

    Ok(())
}

async fn match_file(dir: &PathBuf) -> Result<Vec<String>> {
    let mut file_path_list = vec![];
    let mut file_name_list = vec![];

    let entries = fs::read_dir(dir).map_err(|e| format!("无法读取目录: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("无法读取目录项: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无效的文件名")?
            .to_string();

        if !file_name.contains("概要") {
            continue;
        }
        if !file_name.ends_with(".docx") {
            continue;
        }
        if !["PEK", "SEK", "AEK", "REK"]
            .iter()
            .any(|prefix| file_name.starts_with(prefix))
        {
            continue;
        }

        file_path_list.push(path.to_str().ok_or("路径转换失败")?.to_string());
        file_name_list.push(file_name);
    }

    if !popup_message("是否要修改这些概要？", &file_name_list.join("\n")) {
        return Ok(vec![]);
    }

    Ok(file_path_list)
}

pub async fn replace_docx(target_dir: String, inspector: &str, width: f32, height: f32) -> Result<()> {
    let file_list = match_file(&PathBuf::from(&target_dir)).await?;
    for path in file_list {
        let _ = modify_docx(&path, inspector, width, height);
    }
    Ok(())
}

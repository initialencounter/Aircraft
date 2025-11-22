use lazy_static::lazy_static;
use regex::Regex;
use std::env;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

lazy_static! {
    static ref RE_IMAGE_EXTENT: Regex = Regex::new(r#"cx="(\d+)" cy="(\d+)""#).unwrap();
    static ref RE_IMAGE_BEHIND_DOCUMENT: Regex = Regex::new(r#"behindDoc="(\d)""#).unwrap();
}
pub fn get_signature_path() -> Result<String> {
    let exe_path = env::current_exe()?;
    let parent_path = exe_path.parent().ok_or("无法获取父目录")?;
    let signature_path_buf = parent_path.join("signature.png");
    let signature_path = signature_path_buf.to_str().ok_or("路径转换失败")?;
    Ok(signature_path.to_string())
}
pub fn read_file_to_buffer(file_path: &str) -> Result<Vec<u8>> {
    let mut file_content = Vec::new();
    File::open(PathBuf::from(file_path))?.read_to_end(&mut file_content)?;
    Ok(file_content)
}

pub fn change_title(content: String) -> String {
    let title = "锂电池/钠离子电池UN38.3试验概要";
    let content = content.replace("锂电池UN38.3试验概要", title);
    let content = content.replace("Lithium Battery Test Summary", "Test Summary");
    content.to_string()
}

pub fn change_test_info(content: String, inspector: &str) -> String {
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

pub fn set_image_size(content: String, width: f32, height: f32) -> Result<String> {
    let x = (width * 360000.0) as i32;
    let y = (height * 360000.0) as i32;
    let wp_extent = format!("cx=\"{}\" cy=\"{}\"", x, y);
    let content = RE_IMAGE_EXTENT.replace_all(&content, &wp_extent);
    Ok(content.to_string())
}

pub fn set_image_behind_document(content: String) -> Result<String> {
    let behind_doc = "behindDoc=\"1\"";
    let content = RE_IMAGE_BEHIND_DOCUMENT.replace_all(&content, &behind_doc.to_string());
    Ok(content.to_string())
}

pub fn set_page_margins(content: String) -> Result<String> {
    let re = Regex::new(r#"<w:pgMar[^>]+/>"#).unwrap();

    // 设置页边距为2厘米
    // 2厘米 ≈ 1134 twips (567 * 2)
    let new_margins = r#"<w:pgMar w:top="1134" w:right="1230" w:bottom="567" w:left="1230" w:header="851" w:footer="992" w:gutter="0"/>"#;

    let content = re.replace_all(&content, new_margins);
    Ok(content.to_string())
}

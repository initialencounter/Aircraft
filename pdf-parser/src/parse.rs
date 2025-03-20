use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};

lazy_static! {
    static ref RE_PROJECT_NO: Regex =
        Regex::new(r"项目编号[：:]{1}\s?([PSAR]EKGZ[0-9]{12})\s+").unwrap();
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoodsPDF {
    pub project_no: String,
    pub item_c_name: String,
}

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

fn parse_goods_name(pdf_text: Vec<&str>, is_965: bool) -> String {
    let mut goods_name = String::new();
    let package_index = find_package_index(pdf_text.clone());
    let pdf_text = pdf_text[0..package_index].to_vec();
    println!("{:?}", pdf_text);
    if is_965 {
        for i in 3..pdf_text.len()-1 {
            if pdf_text[i].contains("物品名称") {
                let item_c_name = pdf_text[i].replace("物品名称:", "");
                let item_c_name = item_c_name.replace("物品名称： ", "");
                let item_c_name = item_c_name.replace("物品名称:", "");
                let item_c_name = item_c_name.replace("物品名称：", "");
                let item_c_name = item_c_name.trim();
                goods_name = format!("{}{}",goods_name, item_c_name);
            }else {
                goods_name = format!("{}{}",goods_name, pdf_text[i]);
            }
        }
    } else {
        for i in 3..pdf_text.len()-2 {
            
            if pdf_text[i].contains("物品名称") {
                let item_c_name = pdf_text[i].replace("物品名称:", "");
                let item_c_name = item_c_name.replace("物品名称： ", "");
                let item_c_name = item_c_name.replace("物品名称:", "");
                let item_c_name = item_c_name.replace("物品名称：", "");
                let item_c_name = item_c_name.trim();
                goods_name = format!("{}{}",goods_name, item_c_name);
            }else {
                goods_name = format!("{}{}",goods_name, pdf_text[i]);
            }
        }
    }
    return goods_name.trim().to_string();
}

fn find_package_index(pdf_text: Vec<&str>) -> usize{
    for i in 0..pdf_text.len() {
        if pdf_text[i].contains("包装件") {
            return i;
        }
    }
    return pdf_text.len() - 1;
}
pub fn parse_good_file(pdf_text: String, is_965: bool) -> Result<GoodsPDF> {
    let project_no = match RE_PROJECT_NO.captures(&pdf_text) {
        Some(caps) => match caps.get(1) {
            Some(cap) => cap.as_str().trim().to_string(),
            None => "未找到项目编号".to_string(),
        },
        None => "未找到项目编号".to_string(),
    };
    let binding = pdf_text.clone();
    let text_vec = binding.split("\n\n").collect::<Vec<&str>>();
    let item_c_name = parse_goods_name(text_vec, is_965);
    Ok(GoodsPDF {
        project_no,
        item_c_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::read::read_pdf;

    #[test]
    fn test_parse_good_file() {
        let path = r"0.pdf";
        let result = read_pdf(path, false).unwrap();
        let goods_pdf = parse_good_file(result.text, true);
        println!("{:?}", goods_pdf);
    }
}

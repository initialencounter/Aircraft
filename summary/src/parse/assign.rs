use aircraft_types::summary::SummaryInfo;
use std::collections::HashMap;

use crate::parse::regex::process_newlines;

use super::match_project_no;

pub fn parse_docx_table(content: Vec<String>) -> SummaryInfo {
    let mut summary = SummaryInfo::default();

    // 预先构建字段映射表，避免在循环中重复创建
    let mut field_mappings: HashMap<&str, &mut String> = HashMap::from([
        ("委托单位", &mut summary.consignor),
        ("生产单位", &mut summary.manufacturer),
        ("测试单位", &mut summary.testlab),
        ("名称", &mut summary.cn_name),
        ("电芯类别", &mut summary.classification),
        ("型号", &mut summary.model),
        ("商标", &mut summary.trademark),
        ("额定电压", &mut summary.voltage),
        ("额定容量", &mut summary.capacity),
        ("额定能量", &mut summary.watt),
        ("外观", &mut summary.shape),
        ("质量", &mut summary.mass),
        ("锂含量", &mut summary.licontent),
        ("测试报告编号", &mut summary.test_report_no),
        ("测试标准", &mut summary.test_manual),
        ("高度模拟", &mut summary.test1),
        ("温度试验", &mut summary.test2),
        ("振动", &mut summary.test3),
        ("冲击", &mut summary.test4),
        ("外部短路", &mut summary.test5),
        ("撞击/挤压", &mut summary.test6),
        ("过度充电", &mut summary.test7),
        ("强制放电", &mut summary.test8),
        ("UN38.3.3.1(f)", &mut summary.un38_f),
        ("UN38.3.3.1(g)", &mut summary.un38_g),
        ("备注", &mut summary.note),
    ]);

    for (index, item) in content.iter().enumerate() {
        // 标题
        if item.contains("概要") && item.contains("Test Summary") {
            if let Some(title_part) = item.split("项目编号").next() {
                summary.title = title_part.to_string();
            }
        }
        // 项目编号
        if item.contains("项目编号") {
            summary.project_no = match_project_no(&item);
        }

        // 委托单位信息
        if (item.contains("委托单位") || item.contains("申请商")) && index + 2 < content.len()
        {
            let consignor_info = content[index + 2].clone();
            if !consignor_info.contains("生产单位") && !consignor_info.contains("Manufacturer")
            {
                summary.consignor_info = consignor_info;
            }
        }

        // 生产单位信息
        if (item.contains("生产单位") || item.contains("制造商")) && index + 2 < content.len()
        {
            let manufacturer_info = content[index + 2].clone();
            if !manufacturer_info.contains("测试单位") && !manufacturer_info.contains("Test Lab")
            {
                summary.manufacturer_info = manufacturer_info;
            }
        }

        // 测试单位信息
        if item.contains("测试单位") && index + 2 < content.len() {
            let testlab_info = content[index + 2].clone();
            if !testlab_info.contains("电池信息") && !testlab_info.contains("Battery Information")
            {
                summary.testlab_info = testlab_info.replace("<###>", "\r\n");
            }
        }

        // 英文名称
        if item.contains("电池/电芯类别") && index + 2 < content.len() {
            let cn_name = content[index + 2].clone();
            if !cn_name.contains("型号") && !cn_name.contains("Type") {
                summary.en_name = cn_name;
            }
        }

        // 测试报告签发日期
        if item.contains("测试标准") && index > 0 {
            summary.test_date = content[index - 1].clone();
        }

        // 使用更高效的方式处理字段映射
        for (key, field) in field_mappings.iter_mut() {
            if item.contains(*key) && index + 1 < content.len() {
                **field = content[index + 1].clone();
            }
        }
    }
    if !summary.cn_name.is_empty() {
        summary.cn_name = process_newlines(&summary.cn_name);
    }

    if !summary.trademark.is_empty() {
        if summary.trademark.contains("额定电压") {
            summary.trademark = "/".to_string();
        }
    }

    // 备注
    if summary.note.contains("签名") && summary.note.contains("Signatory") {
        summary.note = "/".to_string();
    }

    // 签发日期
    if let Some(last_item) = content.last() {
        summary.issue_date = last_item.clone();
    } else {
        summary.issue_date = String::new(); // Default to an empty string if content is empty
    }

    summary.test_manual = html_entity_decode(&summary.test_manual);
    summary.consignor_info = html_entity_decode(&summary.consignor_info);
    summary.manufacturer_info = html_entity_decode(&summary.manufacturer_info);
    summary.testlab_info = html_entity_decode(&summary.testlab_info);
    summary.trim_all();
    summary
}

fn html_entity_decode(text: &str) -> String {
    // 定义实体映射表
    let entities: HashMap<&str, &str> = [
        ("&quot;", "\""),
        ("&amp;", "&"),
        ("&lt;", "<"),
        ("&gt;", ">"),
        ("&nbsp;", " "),
        ("&copy;", "©"),
        ("&reg;", "®"),
        ("&apos;", "'"),
        ("&cent;", "¢"),
        ("&pound;", "£"),
        ("&yen;", "¥"),
        ("&euro;", "€"),
        ("&sect;", "§"),
        ("&deg;", "°"),
        ("&plusmn;", "±"),
        ("&middot;", "·"),
    ]
    .iter()
    .cloned()
    .collect();

    let mut result = String::with_capacity(text.len());
    let mut chars = text.char_indices().peekable();

    while let Some((i, c)) = chars.next() {
        if c == '&' {
            // 查找实体结束位置
            if let Some(end_pos) = text[i..].find(';') {
                let entity_end = i + end_pos + 1;
                let entity = &text[i..entity_end];

                if let Some(replacement) = entities.get(entity) {
                    result.push_str(replacement);
                    // 跳过已处理的实体
                    for _ in 0..(entity.chars().count() - 1) {
                        chars.next();
                    }
                    continue;
                }
            }
        }
        result.push(c);
    }

    result
}

#[cfg(test)]
mod tests {
    use crate::{parse_docx_text, read_docx_content};

    use super::*;

    #[test]
    fn test_parse_docx() {
        let text = read_docx_content(
            // r"C:\Users\29115\RustroverProjects\docx-rs\tests\test.docx",
            r"C:\Users\29115\Downloads\8.14众凯（影翎 四款套装）\8.14众凯（影翎 四款套装）\8.14 申请鉴定书-KEYLAB2508006--4种套装\1. A1 标续3电套装\体感控\PEKGZ202508141214 概要.docx",
            vec!["word/document.xml".to_string()],
        );
        let content = parse_docx_text(&text.unwrap()[0].clone());
        println!("{}", content.clone().join("\n"));
        let summary = parse_docx_table(content);
        std::fs::write(
            "test2.json",
            serde_json::to_string_pretty(&summary).unwrap(),
        )
        .unwrap();
    }
}

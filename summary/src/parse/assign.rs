use aircraft_types::summary::SummaryInfo;
use std::collections::HashMap;

use super::match_project_no;

pub fn parse_docx_table(content: Vec<String>) -> SummaryInfo {
    let mut summary = SummaryInfo::default();
    for (index, item) in content.iter().enumerate() {
        // 标题
        if item.contains("概要") && item.contains("Test Summary") {
            summary.title = item.clone().split("项目编号").next().unwrap().to_string();
        }
        // 项目编号
        if item.contains("项目编号") {
            summary.project_no = match_project_no(&item);
        }
        // 测试报告签发日期
        if item.contains("测试标准") {
            summary.test_date = content[index - 1].clone();
        }
        let field_mappings = HashMap::from([
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

        for (key, field) in field_mappings {
            if item.contains(key) {
                *field = content[index + 1].clone();
            }
        }
    }
    // 签发日期
    if let Some(last_item) = content.last() {
        summary.issue_date = last_item.clone();
    } else {
        summary.issue_date = String::new(); // Default to an empty string if content is empty
    }
    summary
}

#[cfg(test)]
mod tests {
    use crate::{parse_docx_text, read_docx_content};

    use super::*;

    #[test]
    fn test_parse_docx() {
        let text = read_docx_content(
            // r"C:\Users\29115\RustroverProjects\docx-rs\tests\test.docx",
            r"C:\Users\29115\Downloads\PEKGZ202412167637 概要.docx",
            vec!["word/document.xml".to_string()],
        );
        let content = parse_docx_text(&text.unwrap()[0].clone());
        println!("{}", content.clone().join("\n"));
        let summary = parse_docx_table(content);
        std::fs::write("test2.json", serde_json::to_string(&summary).unwrap()).unwrap();
    }
}

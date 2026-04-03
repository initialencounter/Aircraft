use serde_json::Value;
use std::collections::HashSet;
use std::error::Error;
use std::fs::File;
use std::io::{BufReader, BufWriter};

/// 读取 search.json，根据 itemCName 去重，只保留第一条，然后保存到新的 json 文件
pub fn remove_duplicates_by_cname(input_path: &str, output_path: &str) -> Result<(), Box<dyn Error>> {
    // 1. 读取输入的 JSON 文件
    let file = File::open(input_path)?;
    let reader = BufReader::new(file);
    let mut data: Value = serde_json::from_reader(reader)?;

    // 2. 准备去重用的 HashSet 和保存结果的 Vec
    let mut seen_cnames = HashSet::new();
    let mut deduplicated_items = Vec::new();

    // 3. 检查数据中是否包含 rows 数组
    if let Some(array) = data.get("rows").and_then(|v| v.as_array()) {
        for item in array {
            // 尝试获取 itemCName 字段的值
            if let Some(cname) = item.get("itemCName").and_then(|v| v.as_str()) {
                // 如果 insert 返回 true，说明 HashSet 中之前没有这个名字
                if seen_cnames.insert(cname.to_string()) {
                    deduplicated_items.push(item.clone());
                }
            } else {
                // 如果没有 itemCName 字段，默认保留
                deduplicated_items.push(item.clone());
            }
        }
    } else {
        return Err("JSON 结构中找不到 'rows' 数组".into());
    }

    // 更新原始的 JSON 结构（更新 rows 及其数量 total）
    if let Some(obj) = data.as_object_mut() {
        obj.insert("total".to_string(), serde_json::json!(deduplicated_items.len()));
        obj.insert("rows".to_string(), Value::Array(deduplicated_items));
    }

    // 4. 将去重后的数据写入新的 JSON 文件
    let out_file = File::create(output_path)?;
    let writer = BufWriter::new(out_file);

    // 使用 to_writer_pretty 让输出的 JSON 有良好的格式（带缩进）
    serde_json::to_writer_pretty(writer, &data)?;

    println!("去重完成，已将结果保存至 {}", output_path);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_duplicates() {
        // 示例用法:
        if let Err(e) = remove_duplicates_by_cname(r"D:\dev\Aircraft\image_classifier\src\search.json", "search_deduped.json") {
            println!("Error: {}", e);
        }
    }
}

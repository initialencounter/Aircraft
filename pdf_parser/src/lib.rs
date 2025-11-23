pub mod parse;
pub mod read;

// 从统一的 types 包导入类型
pub use aircraft_types::pdf_parser::{GoodsInfo, PdfReadResult};

#[cfg(test)]
mod tests {
    use super::*;
    use read::replace_whitespace_with_space;

    fn insert_space_between_en_and_cn(text: &str) -> String {
        let mut result = String::new();
        let chars: Vec<char> = text.chars().collect();

        for i in 0..chars.len() {
            result.push(chars[i]);
            if i < chars.len() - 1 {
                // 检查当前字符和下一个字符之间是否需要插入空格
                if chars[i].is_ascii() && !chars[i + 1].is_ascii() {
                    if chars[i] != ' ' && chars[i + 1] != ' ' {
                        result.push(' ');
                    }
                } else if !chars[i].is_ascii() && chars[i + 1].is_ascii() {
                    if chars[i] != ' ' && chars[i + 1] != ' ' {
                        result.push(' ');
                    }
                }
            }
        }
        result
    }

    #[test]
    fn test_insert_space_between_en_and_cn() {
        let text = "锂离子电池 RT PRO 3.7V 3000mAh 11.1Wh（与手机 RT PRO包装在一起）"; // 锂离子电池  RT PRO 3.7V 3000mAh 11.1Wh （与手机  RT PRO 包装在一起）
        let result = replace_whitespace_with_space(&text); // 锂离子电池  RT PRO 3.7V 3000mAh 11.1Wh （与手机  RT PRO 包装在一起）
        let result = insert_space_between_en_and_cn(&result);
        println!("{}", result);
    }
}

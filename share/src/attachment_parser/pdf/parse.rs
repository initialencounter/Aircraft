use serde::{Serialize, Deserialize};
use lazy_static::lazy_static;
use regex::Regex;


lazy_static! {
    static ref RE_PROJECT_NO: Regex = Regex::new(r"项目编号[：:]{1}\s?([PSAR]EKGZ[0-9]{12})\s+").unwrap();
    static ref RE_ITEM_C_NAME: Regex = Regex::new(r"物品名称\s?[：:]{1}\s?(.*)\s?电池").unwrap();
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoodsPDF {
  pub project_no: String,
  pub item_c_name: String,
}

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn parse_good_file(pdf_text: String) -> Result<GoodsPDF> {
  let project_no = match RE_PROJECT_NO.captures(&pdf_text){
    Some(caps) => {
        match caps.get(1) { 
            Some(cap) => cap.as_str().trim().to_string(),
            None => "未找到项目编号".to_string(),
        }
    },
    None => "未找到项目编号".to_string(),
  };
  let item_c_name = match RE_ITEM_C_NAME.captures(&pdf_text) { 
    Some(caps) => {
        match caps.get(1) { 
            Some(cap) => cap.as_str().trim().to_string(),
            None => "未找到物品名称".to_string(),
        }
    },
    None => "未找到物品名称".to_string(),
  };
  Ok(GoodsPDF {
    project_no,
    item_c_name,
  })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::attachment_parser::pdf::read::read_pdf;

    #[test]
    fn test_parse_good_file() {
        let path = r"0.pdf";
        let result = read_pdf(path).unwrap();
        let goods_pdf = parse_good_file(result.text);
        println!("{:?}", goods_pdf);
    }
}

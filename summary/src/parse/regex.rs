use lazy_static::lazy_static;
use regex::Regex;
lazy_static! {
    static ref RE_PROJECT_NO: Regex = Regex::new(r"([PSAR]EKGZ[0-9]{12})").unwrap();
    static ref PROCSESS_C_NMAE: Regex = Regex::new(r"(?<chinese>[\p{Script=Han}])\n(?<chinese2>[\p{Script=Han}])|(?<english>[\w ])\n(?<english2>[\w ])").unwrap();
}
pub fn match_project_no(content: &str) -> String {
    let matches: Vec<String> = RE_PROJECT_NO
        .captures_iter(&content)
        .filter_map(|cap| cap[1].parse::<String>().ok())
        .collect();
    if matches.is_empty() {
        "".to_string()
    } else {
        matches[0].to_string()
    }
}

pub fn process_newlines(text: &str) -> String {
    PROCSESS_C_NMAE
        .replace_all(text, |caps: &regex::Captures| {
            // 如果匹配到中文字符之间的换行
            if caps.name("chinese").is_some() {
                format!(
                    "{}{}",
                    caps.name("chinese").unwrap().as_str(),
                    caps.name("chinese2").unwrap().as_str()
                )
            }
            // 如果匹配到英文字符之间的换行
            else {
                format!(
                    "{} {}",
                    caps.name("english").unwrap().as_str(),
                    caps.name("english2").unwrap().as_str()
                )
            }
        })
        .to_string()
}

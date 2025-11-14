use clipboard_win::get_clipboard_string;
use flextrek::get_explorer_selected_file::get_explorer_selected_file;
use regex::Regex;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

fn replace_in_multiline(input: &str, project_no: String) -> String {
    let pattern_without_anchors =
        r"[A-Z]EK[A-Z]{2}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}";
    let re_without_anchors = Regex::new(pattern_without_anchors).unwrap();

    // 替换匹配的字符串
    re_without_anchors
        .replace_all(input, &project_no)
        .to_string()
}

fn check_project_no_format(project_no: &str) -> bool {
    let pattern = r"^[A-Z]EK[A-Z]{2}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}$";
    let re = Regex::new(pattern).unwrap();
    re.is_match(project_no)
}

pub fn copy2_callback() -> Result<()> {
    let project_no = get_clipboard_string().unwrap_or("".to_string());
    if project_no.is_empty() {
        return Err("剪贴板内容为空".into());
    }
    if !check_project_no_format(&project_no) {
        return Err("剪贴板内容不符合项目编号格式".into());
    }
    let paths = get_explorer_selected_file();
    if paths.len() != 2 {
        return Err("未选择文件".into());
    }
    if (paths[0].ends_with(".doc") && paths[1].ends_with(".docx"))
        || (paths[0].ends_with(".docx") && paths[1].ends_with(".doc"))
    {
        for path in paths {
            let new_path_str = replace_in_multiline(&path, project_no.clone());
            let new_path = std::path::Path::new(&new_path_str);
            println!("复制到: {:?}", new_path);
            let from = std::path::Path::new(&path);
            match std::fs::copy(from, new_path) {
                Ok(_) => {
                    open_with_wps(new_path.to_path_buf());
                }
                Err(e) => {
                    return Err(format!("复制文件失败: {}", e).into());
                }
            }
        }
        Ok(())
    } else {
        Err("请选中一对 Word 文件 (.doc 和 .docx)".into())
    }
}

fn open_with_wps(file_path: std::path::PathBuf) {
    let _ = std::process::Command::new("ksolaunch")
        .arg(file_path)
        .spawn();
}

#[cfg(test)]
mod tests {
    use flextrek::listen;

    use super::*;

    #[test]
    fn test_replace_in_multiline() {
        let _ = listen("ctrl+shift+x".to_string(), || async move {
            let _ = copy2_callback();
        });
        loop {
            std::thread::sleep(std::time::Duration::from_secs(100));
        }
    }

    #[test]
    fn test_check_project_no_format() {
        let valid_project_no = "SEKGZ202510240660";
        assert!(check_project_no_format(valid_project_no));
    }
}

use reqwest;
use serde::Deserialize;
use tauri::{self, WebviewWindow};

#[derive(Deserialize)]
struct Release {
    tag_name: String,
}

#[tauri::command]
pub fn restart() {
    tauri::process::restart(&tauri::Env::default())
}

pub fn check_update(flag: String) -> String {
    let url = "https://api.github.com/repos/initialencounter/aircraft/releases/latest";
    let client = reqwest::blocking::Client::new();

    let resp = match client
        .get(url)
        .header(reqwest::header::USER_AGENT, "rust-app")
        .send()
    {
        Ok(response) => response,
        Err(_) => return flag,
    };

    if !resp.status().is_success() {
        return flag;
    }

    let release = match resp.json::<Release>() {
        Ok(release) => release,
        Err(_) => return flag,
    };
    release.tag_name
}

pub fn hide_or_show<'a>(window: WebviewWindow) -> &'a str {
    if window.is_visible().unwrap() {
        window.hide().unwrap();
        "显示(S)"
    } else {
        window
            .set_always_on_top(true)
            .expect("Failed to set window as topmost");
        window.show().unwrap();
        if window.is_minimized().unwrap() {
            window.unminimize().unwrap();
        }
        "隐藏(H)"
    }
}
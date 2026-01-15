use crate::utils::{check_update, hide_or_show, restart};
use crate::{menu, Link};
use share::config::ConfigManager;
use std::env;
use tauri::menu::{MenuBuilder, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Emitter, Manager, WindowEvent, Wry};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

pub fn handle_tray_icon_event(tray: &TrayIcon, event: &TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window("main") {
            hide_or_show(window);
        }
    }
}

pub fn handle_menu_event_update(app: &AppHandle<Wry>) {
    let current_version = format!("v{}", env!("CARGO_PKG_VERSION"));
    let latest = check_update(String::from("000"));
    if latest == "000" {
        app.dialog()
            .message("检查更新失败!")
            .kind(MessageDialogKind::Error)
            .show(|_| {});
    } else if latest != current_version {
        app.dialog()
            .message(format!("发现新版本{}，是否前往", latest))
            .kind(MessageDialogKind::Info)
            .show(|_| {});
        app.emit(
            "open_link",
            Some(Link {
                link: "https://github.com/initialencounter/Aircraft/releases/latest".to_string(),
            }),
        )
        .unwrap();
    } else {
        app.dialog()
            .message("当前版本是最新版")
            .kind(MessageDialogKind::Info)
            .show(|_| {});
    }
}

pub fn handle_setup(app: &mut App) {
    let [help_, quit, about, update, restart_] = menu::create_menu_item(app);
    let tray_menu = MenuBuilder::new(app)
        .items(&[
            &help_,
            &about,
            &update,
            &PredefinedMenuItem::separator(app).unwrap(),
            &restart_,
            &PredefinedMenuItem::separator(app).unwrap(),
            &quit,
        ]) // insert the menu items here
        .build()
        .unwrap();
    let _ = TrayIconBuilder::with_id("system-tray-1")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
      "help" => app
        .emit(
          "open_link",
          Some(Link {
            link: "https://github.com/initialencounter/Aircraft?tab=readme-ov-file#使用帮助"
              .to_string(),
          }),
        )
        .unwrap(),
      "quit" => app.exit(0),
      "restart" => restart(),
      "about" => app
        .emit(
          "open_link",
          Some(Link {
            link: "https://github.com/initialencounter/Aircraft".to_string(),
          }),
        )
        .unwrap(),
      "update" => handle_menu_event_update(&app),
      _ => {}
    }
        })
        .on_tray_icon_event(|tray, event| {
            handle_tray_icon_event(tray, &event);
        })
        .build(app)
        .unwrap();
    // 静默启动
    let config = ConfigManager::get_config();
    if config.base.silent_start {
        if let Some(window) = app.get_webview_window("main") {
            window.hide().unwrap();
        }
    }
    // 设置窗口置顶
    // app.get_webview_window("main").unwrap().set_always_on_top(true).expect("Failed to set window as topmost");
    let window = app.get_webview_window("main").unwrap();
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            window_clone.hide().unwrap();
        }
    });
    // 静默启动
    if !config.base.silent_start {
        app.get_webview_window("main").unwrap().show().unwrap();
    }
}

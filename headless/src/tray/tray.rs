use image::load_from_memory;
use std::{env, process::Command, ptr};
use tao::event_loop::EventLoopProxy;
use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem},
    Icon, TrayIconBuilder,
};
use windows::Win32::System::Console::GetConsoleWindow;
use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOW};

use windows::core::s;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{FindWindowA, SW_HIDE};

use crate::utils::restart_program;

pub fn hide_console_window() {
    unsafe {
        let window = FindWindowA(s!("ConsoleWindowClass"), None).unwrap_or(HWND(0 as isize as _));
        if window != HWND(0 as isize as _) {
            let _ = ShowWindow(window, SW_HIDE);
        }
    }
}

pub struct TrayHandler {
    _tray_icon: tray_icon::TrayIcon,
}

impl TrayHandler {
    pub fn new(event_loop_proxy: EventLoopProxy<()>) -> Self {
        // 创建托盘菜单
        let tray_menu = Menu::new();
        let show_console_item = MenuItem::new("显示终端", true, None);
        let hide_console_item = MenuItem::new("隐藏终端", true, None);
        let open_app_dir_item = MenuItem::new("打开应用目录", true, None);
        let restart_item = MenuItem::new("重启", true, None);
        let quit_item = MenuItem::new("退出", true, None);

        let show_console_id = show_console_item.id().clone();
        let hide_console_id = hide_console_item.id().clone();
        let open_app_dir_id = open_app_dir_item.id().clone();
        let restart_id = restart_item.id().clone();
        let quit_id = quit_item.id().clone();

        tray_menu.append(&show_console_item).unwrap();
        tray_menu.append(&hide_console_item).unwrap();
        tray_menu.append(&open_app_dir_item).unwrap();
        tray_menu.append(&restart_item).unwrap();
        tray_menu.append(&quit_item).unwrap();

        let icon_bytes = include_bytes!("../../resources/favicon.ico");
        let icon = load_icon(icon_bytes);
        // 创建托盘图标
        let tray_icon = TrayIconBuilder::new()
            .with_icon(icon)
            .with_menu(Box::new(tray_menu))
            .with_tooltip("文件上传服务")
            .build()
            .unwrap();

        // 处理托盘菜单事件
        let menu_channel = MenuEvent::receiver();

        tokio::spawn(async move {
            while let Ok(event) = menu_channel.recv() {
                if event.id == quit_id {
                    let _ = event_loop_proxy.send_event(());
                } else if event.id == show_console_id {
                    unsafe {
                        let window = GetConsoleWindow();
                        if window.0 != ptr::null_mut() {
                            let _ = ShowWindow(window, SW_SHOW);
                        }
                    }
                } else if event.id == hide_console_id {
                    let _ = hide_console_window();
                } else if event.id == restart_id {
                    let _ = restart_program();
                } else if event.id == open_app_dir_id {
                    let _ = open_app_dir();
                }
            }
        });

        Self {
            _tray_icon: tray_icon,
        }
    }
}

fn load_icon(buffer: &[u8]) -> Icon {
    let (icon_rgba, icon_width, icon_height) = {
        let image = load_from_memory(buffer)
            .expect("Failed to open icon path")
            .into_rgba8();
        let (width, height) = image.dimensions();
        let rgba = image.into_raw();
        (rgba, width, height)
    };
    Icon::from_rgba(icon_rgba, icon_width, icon_height).expect("Failed to open icon")
}

fn open_app_dir() {
    let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
    let _ = Command::new("explorer").arg(current_exe.parent().unwrap()).spawn();
}
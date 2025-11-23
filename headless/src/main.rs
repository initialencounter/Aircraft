mod config;
mod tray;
mod utils;
use aircraft_types::config::{LLMConfig, ServerConfig};
use config::read_env_to_config;
use is_elevated::is_elevated;
use share::{logger::Logger, task_proxy::run as task_proxy_run};
use std::{
    env,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tao::event_loop::{ControlFlow, EventLoop};
use tokio::sync::watch;
use tray::{tray::TrayHandler, window::hide_console_window};
use utils::{create_auto_run_reg, is_launched_from_registry, request_admin_and_restart};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[tokio::main]
async fn main() -> Result<()> {
    let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
    // 如果未设置开机自启动，则设置开机自启动
    if !is_launched_from_registry() {
        // 如果当前为管理员权限，则创建注册表自启动
        if is_elevated() {
            println!("当前已为管理员权限");
            let _ = create_auto_run_reg("AircraftHeadless", &current_exe.to_str().unwrap());
            println!("创建注册表自启动成功");
        } else {
            // 如果当前为非管理员权限，则请求管理员权限并重新启动程序
            if request_admin_and_restart(&current_exe) {
                std::process::exit(0);
            }
        }
    }

    let log_dir = current_exe.parent().unwrap().join("logs");
    let config = match read_env_to_config(&current_exe) {
        Ok(config) => config,
        Err(_e) => ServerConfig::default(),
    };
    // 创建事件循环
    let event_loop = EventLoop::new();

    // 只在非调试模式下隐藏窗口
    if !std::env::args().any(|arg| arg == "--debug") {
        let _ = hide_console_window();
    }

    // 创建托盘
    let _tray_handler = TrayHandler::new(event_loop.create_proxy());

    let logger = Arc::new(Mutex::new(Logger::new(
        PathBuf::from(log_dir),
        "aircraft",         // app数据目录
        config.log_enabled, // 日志目录
        false,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    let (shutdown_tx, shutdown_rx) = watch::channel(false);
    let _ = tokio::spawn(task_proxy_run(
        config.base_url,
        config.username,
        config.password,
        config.port,
        config.debug,
        shutdown_rx,
        log_tx,
        LLMConfig::default(),
    ));

    // 运行事件循环
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        if let tao::event::Event::UserEvent(()) = event {
            *control_flow = ControlFlow::Exit;
            shutdown_tx.send(true).unwrap();
            std::process::exit(0);
        }
    });
}

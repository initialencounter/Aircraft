#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};

use aircraft_types::config::Config;
use aircraft_types::logger::LogMessage;
use flextrek::listen_explorer_drag::{listen_explorer_drag_files, DragHandle};
use napi::bindgen_prelude::Function;
use napi::threadsafe_function::{ThreadsafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use share::config::ConfigManager;
use share::logger::Logger;
use share::manager::server_manager::ServerManager;
use share::task_proxy::get_http_client;
use share::task_proxy::webhook::SERVER_PORT;
use share::task_proxy::LOGIN_STATUS;
use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE, VK_LBUTTON};

#[napi(js_name = "AircraftRs")]
pub struct AircraftRs {
  log_tx: Sender<LogMessage>,
  logger: Arc<Mutex<Logger>>,
}

#[napi]
impl AircraftRs {
  #[napi(constructor)]
  pub fn new(app_log_dir: String) -> Self {
    let config = ConfigManager::get_config();
    let logger = Arc::new(Mutex::new(Logger::new(
      PathBuf::from(app_log_dir),
      "aircraft",                // app数据目录
      config.server.log_enabled, // 日志目录
      true,
    )));
    let log_tx = logger.lock().unwrap().log_tx.clone();
    let server_manager = ServerManager::new(config.server, log_tx.clone(), config.llm);
    server_manager.start();
    Self { log_tx, logger }
  }

  #[napi]
  pub fn write_log(&self, log: LogMessage) -> napi::Result<()> {
    self.log_tx.send(log).unwrap();
    Ok(())
  }

  #[napi]
  pub fn try_get_logs(&self) -> napi::Result<Vec<LogMessage>> {
    let logs = self.logger.lock().unwrap().try_get_logs();
    Ok(logs)
  }
}

#[napi]
pub fn get_default_config() -> napi::Result<Config> {
  let config = Config::default();
  Ok(config)
}

#[napi]
pub fn open_local_dir(target: String) {
  share::utils::fs::open_local_dir(&target);
}

#[napi]
pub fn get_login_status() -> bool {
  LOGIN_STATUS.load(std::sync::atomic::Ordering::Relaxed)
}

#[napi]
pub fn get_config() -> napi::Result<Config> {
  let config = share::config::ConfigManager::get_config();
  Ok(config)
}

#[napi]
pub fn save_config(config: Config) -> napi::Result<()> {
  let _ = share::config::ConfigManager::save_config(&config);
  Ok(())
}

#[napi]
pub fn get_server_port() -> u16 {
  SERVER_PORT.load(std::sync::atomic::Ordering::Relaxed) as u16
}

/// 拖拽监听状态：flextrek 的 Explorer 拖拽钩子全局唯一，进程内只允许注册一次。
/// 仅存 DragHandle；TSFN 由监听回调闭包持有的 Arc 保持存活，unregister 后线程退出即释放。
struct DropListenerState {
  handle: DragHandle,
}

static DROP_LISTENER: Mutex<Option<DropListenerState>> = Mutex::new(None);

/// 注册全局 Explorer 文件拖拽监听：拖拽开始时把文件路径列表回调给 JS（Electron 主进程）。
/// 回调经 ThreadsafeFunction 投递，可在 flextrek 的阻塞线程池线程上安全调用。
#[napi]
pub fn start_drop_listener(callback: Function<'static>) -> napi::Result<()> {
  let tsfn: ThreadsafeFunction<Vec<String>, _, Vec<String>, _> = callback
    .build_threadsafe_function::<Vec<String>>()
    .callee_handled::<true>()
    .build_callback(|ctx: ThreadsafeCallContext<Vec<String>>| Ok(ctx.value))?;
  let cb = Arc::new(tsfn);
  let handle = listen_explorer_drag_files(move |files: Vec<String>| {
    let cb = cb.clone();
    async move {
      let _ = cb.call(Ok(files), ThreadsafeFunctionCallMode::NonBlocking);
    }
  });
  // 若已注册过则先卸载旧钩子再替换，保证全局唯一。
  if let Some(prev) = DROP_LISTENER.lock().unwrap().take() {
    prev.handle.unregister();
  }
  *DROP_LISTENER.lock().unwrap() = Some(DropListenerState { handle });
  Ok(())
}

/// 卸载全局拖拽监听。
#[napi]
pub fn stop_drop_listener() {
  if let Some(listener) = DROP_LISTENER.lock().unwrap().take() {
    listener.handle.unregister();
  }
}

#[napi(object)]
pub struct DropInputState {
  pub lbutton: bool,
  pub escape: bool,
}

/// 供 JS 拖拽会话循环轮询的按键状态：左键是否按下、ESC 是否按下。
#[napi]
pub fn get_drop_input_state() -> DropInputState {
  DropInputState {
    lbutton: is_key_down(VK_LBUTTON.0),
    escape: is_key_down(VK_ESCAPE.0),
  }
}

/// 只判断键的按下/抬起（高位），不使用"自上次调用后是否按下"位（该位需要消息泵维护）。
fn is_key_down(vk: u16) -> bool {
  unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 }
}

/// 拖拽确认后进程内直调上传（与上传热键同一条路径），避免 loopback HTTP 自调。
/// 内部含原生确认对话框，跑在 napi 的 tokio runtime 上，不阻塞主进程。
#[napi]
pub async fn post_file_from_file_list(files: Vec<String>) -> napi::Result<Vec<String>> {
  let client = get_http_client()
    .ok_or_else(|| napi::Error::from_reason("[拖放目标] 服务器未就绪，跳过上传".to_string()))?;
  Ok(client.post_file_from_file_list(files).await)
}

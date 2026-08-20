use flextrek::listen_explorer_drag::{listen_explorer_drag_files, DragHandle};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE, VK_LBUTTON};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

/// 拖拽承接窗口的控制器接口，由 tauri 层实现（share 不依赖 tauri）。
/// 坐标均为物理屏幕像素，与 `GetCursorPos` 返回一致，无 DPI 换算。
pub trait DropZoneController: Send + Sync {
    /// 在光标附近显示小窗，参数为当前光标位置。
    fn show(&self, cx: i32, cy: i32);
    /// 光标是否落在窗口当前区域内。
    fn is_hovered(&self, cx: i32, cy: i32) -> bool;
    /// 放大/缩小窗口（左上角锚定增长，光标保持在内，cx/cy 暂不使用）。
    fn set_enlarged(&self, enlarged: bool, cx: i32, cy: i32);
    /// 隐藏/销毁窗口。
    fn hide(&self);
}

pub struct DropTargetManager {
    drag_handle: Mutex<Option<DragHandle>>,
    controller: Arc<dyn DropZoneController>,
    on_confirm: Arc<dyn Fn(Vec<String>) + Send + Sync>,
    /// 一次只允许一个承接会话，防止并发拖拽叠加。
    active: Arc<AtomicBool>,
    /// stop() 时置位，让进行中的会话立即退出。
    abort: Arc<AtomicBool>,
}

impl DropTargetManager {
    pub fn new(
        controller: Arc<dyn DropZoneController>,
        on_confirm: Arc<dyn Fn(Vec<String>) + Send + Sync>,
    ) -> Self {
        Self {
            drag_handle: Mutex::new(None),
            controller,
            on_confirm,
            active: Arc::new(AtomicBool::new(false)),
            abort: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self) {
        // flextrek 的拖拽监听全局唯一，只允许注册一次。
        if self.drag_handle.lock().unwrap().is_some() {
            return;
        }
        let controller = self.controller.clone();
        let on_confirm = self.on_confirm.clone();
        let active = self.active.clone();
        let abort = self.abort.clone();
        let handle = listen_explorer_drag_files(move |files: Vec<String>| {
            let controller = controller.clone();
            let on_confirm = on_confirm.clone();
            let active = active.clone();
            let abort = abort.clone();
            async move {
                // 回调运行在 flextrek 的阻塞池线程，必须立即返回，不能阻塞。
                if active
                    .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                    .is_ok()
                {
                    std::thread::spawn(move || {
                        run_drop_session(files, controller, on_confirm, active, abort)
                    });
                }
            }
        });
        *self.drag_handle.lock().unwrap() = Some(handle);
    }

    pub fn stop(&self) {
        self.abort.store(true, Ordering::SeqCst);
        if let Some(handle) = self.drag_handle.lock().unwrap().take() {
            handle.unregister();
        }
    }
}

/// 一次拖拽承接会话：显示小窗 → 轮询鼠标 → 放大反馈 → 松开判定 → 回调。
fn run_drop_session(
    files: Vec<String>,
    controller: Arc<dyn DropZoneController>,
    on_confirm: Arc<dyn Fn(Vec<String>) + Send + Sync>,
    active: Arc<AtomicBool>,
    abort: Arc<AtomicBool>,
) {
    let (cx, cy) = cursor_pos();
    controller.show(cx, cy);

    let start = Instant::now();
    let mut enlarged = false;
    loop {
        let (x, y) = cursor_pos();
        // 光标进入窗口即放大一次，单调放大不缩回，避免边界振荡。
        if !enlarged && controller.is_hovered(x, y) {
            controller.set_enlarged(true, x, y);
            enlarged = true;
        }
        let esc = is_key_down(VK_ESCAPE.0);
        let lbtn = is_key_down(VK_LBUTTON.0);
        if abort.load(Ordering::SeqCst)
            || esc
            || !lbtn
            || start.elapsed() > Duration::from_secs(60)
        {
            break;
        }
        std::thread::sleep(Duration::from_millis(30));
    }

    let (rx, ry) = cursor_pos(); // 松开时的光标位置
    let confirmed = !abort.load(Ordering::SeqCst) && controller.is_hovered(rx, ry);

    controller.hide();
    active.store(false, Ordering::SeqCst);

    if confirmed {
        on_confirm(files);
    }
}

fn cursor_pos() -> (i32, i32) {
    unsafe {
        let mut pt = POINT::default();
        let _ = GetCursorPos(&mut pt);
        (pt.x, pt.y)
    }
}

/// 只判断键的按下/抬起（高位），不使用"自上次调用后是否按下"位（该位需要消息泵维护）。
fn is_key_down(vk: u16) -> bool {
    unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 }
}

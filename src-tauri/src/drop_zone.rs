use share::manager::drop_target_manager::DropZoneController;
use std::sync::Mutex;
use tauri::{
    AppHandle, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

/// 小窗尺寸（物理像素）。
const SMALL: u32 = 110;
/// 放大后的尺寸（物理像素）。
const LARGE: u32 = 200;
/// 窗口距屏幕工作区右/下边距（物理像素）。
const MARGIN: i32 = 20;

/// 用 Tauri WebviewWindow 实现的拖拽承接窗口控制器。
/// 窗口惰性创建一次并复用，避免每次拖拽都重建 WebView2（约 300ms 延迟）。
pub struct TauriDropZone {
    app: AppHandle,
    window: Mutex<Option<WebviewWindow>>,
    /// 窗口右下角锚点 (x, y)，物理像素：放大时保持该角不动、向屏幕内侧扩展，
    /// 光标（已在窗口内）放大后仍保持在窗口内。
    anchor: Mutex<(i32, i32)>,
    /// 最近一次设置的目标矩形 (x, y, w, h)，物理像素，供 is_hovered 直接判定。
    rect: Mutex<(i32, i32, u32, u32)>,
}

impl TauriDropZone {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            window: Mutex::new(None),
            anchor: Mutex::new((0, 0)),
            rect: Mutex::new((0, 0, 0, 0)),
        }
    }

    fn get_or_create(&self) -> Option<WebviewWindow> {
        if let Some(window) = self.window.lock().unwrap().clone() {
            return Some(window);
        }
        let window = WebviewWindowBuilder::new(
            &self.app,
            "drop_zone",
            WebviewUrl::App("drop_zone.html".into()),
        )
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .focused(false)
        // focusable(false) 映射为 WS_EX_NOACTIVATE：show() 不会激活窗口，
        // 避免激活中断资源管理器的 OLE 拖拽。
        .focusable(false)
        .visible(false)
        // 禁止 WebView2 作为 OLE 放落目标，避免触发 JS drop 事件。
        .drag_and_drop(false)
        .disable_drag_drop_handler()
        .inner_size(SMALL as f64, SMALL as f64)
        .build()
        .ok()?;
        *self.window.lock().unwrap() = Some(window.clone());
        Some(window)
    }
}

impl DropZoneController for TauriDropZone {
    fn show(&self, cx: i32, cy: i32) {
        let Some(window) = self.get_or_create() else {
            return;
        };
        // 定位在光标所在显示器的工作区右下角（找不到则回退主显示器）。
        let monitor = self
            .app
            .monitor_from_point(cx as f64, cy as f64)
            .ok()
            .flatten()
            .or_else(|| self.app.primary_monitor().ok().flatten());
        let (ax, ay) = monitor
            .map(|m| {
                let work_area = m.work_area();
                (
                    work_area.position.x + work_area.size.width as i32 - MARGIN,
                    work_area.position.y + work_area.size.height as i32 - MARGIN,
                )
            })
            .unwrap_or((0, 0));
        *self.anchor.lock().unwrap() = (ax, ay);

        let pos = PhysicalPosition::new(ax - SMALL as i32, ay - SMALL as i32);
        let size = PhysicalSize::new(SMALL, SMALL);
        let _ = window.set_position(pos);
        let _ = window.set_size(size);
        let _ = window.show();
        *self.rect.lock().unwrap() = (pos.x, pos.y, size.width, size.height);
    }

    fn is_hovered(&self, cx: i32, cy: i32) -> bool {
        let (x, y, w, h) = *self.rect.lock().unwrap();
        w != 0 && cx >= x && cx < x + w as i32 && cy >= y && cy < y + h as i32
    }

    fn set_enlarged(&self, enlarged: bool, _cx: i32, _cy: i32) {
        let Some(window) = self.window.lock().unwrap().clone() else {
            return;
        };
        let size = if enlarged { LARGE } else { SMALL };
        let (ax, ay) = *self.anchor.lock().unwrap();
        // 右下角锚定：窗口右下角顶到锚点，放大向屏幕内侧扩展，光标保持在内。
        let pos = PhysicalPosition::new(ax - size as i32, ay - size as i32);
        let size = PhysicalSize::new(size, size);
        let _ = window.set_size(size);
        let _ = window.set_position(pos);
        *self.rect.lock().unwrap() = (pos.x, pos.y, size.width, size.height);
    }

    fn hide(&self) {
        if let Some(window) = self.window.lock().unwrap().clone() {
            let _ = window.hide();
        }
        *self.rect.lock().unwrap() = (0, 0, 0, 0);
    }
}

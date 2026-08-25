import path from 'path'
import { BrowserWindow, screen } from 'electron'

import type { Context } from 'cordis'
import { Service } from 'cordis'
import type {} from '../service/app'

declare module 'cordis' {
  interface Context {
    dropTarget: DropTarget
  }
}

/// 小窗尺寸（DIP）。
const SMALL = 160
/// 放大后的尺寸（DIP）。
const LARGE = 250
/// 窗口距屏幕工作区右/下边距（DIP）。
const MARGIN = 40

/// QQ 式拖放承接：监听资源管理器文件拖拽，右下角弹出小窗，
/// 悬停放大提示，松开悬停在窗内即进程内直调上传（与上传热键同一条路径）。
class DropTarget extends Service {
  static inject = ['app', 'bindings']
  private win: BrowserWindow | null = null
  /// 一次只允许一个承接会话，防止并发拖拽叠加。
  private active = false
  /// ESC/超时取消标记。
  private abort = false
  /// 窗口右下角锚点 (x, y)（DIP）：放大时保持该角不动、向屏幕内侧扩展。
  private anchor = { x: 0, y: 0 }
  /// 最近一次设置的目标矩形 (x, y, w, h)（DIP），供 isHovered 直接判定。
  private rect = { x: 0, y: 0, w: 0, h: 0 }

  constructor(ctx: Context) {
    super(ctx, 'dropTarget')
    ctx.on('electron-ready', () => {
      // CalleeHandled=true 的 ThreadsafeFunction 按 Node 错误约定调用：
      // 回调第一个参数是错误(null)，第二个才是文件路径数组。
      // NAPI 生成的 TS 类型只声明了单个参数，这里用断言对齐运行时签名。
      this.ctx.bindings.native.startDropListener(
        ((_err: unknown, files: unknown) => {
          if (Array.isArray(files)) void this.runDropSession(files)
        }) as (arg?: unknown) => unknown
      )
    })
    ctx.app.app.on('will-quit', () => {
      this.ctx.bindings.native.stopDropListener()
    })
  }

  /// 惰性创建一次并复用拖放承接窗，避免每次拖拽都重建窗口。
  private getOrCreateWindow(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    this.win = new BrowserWindow({
      width: SMALL,
      height: SMALL,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      // focusable(false) 映射为 WS_EX_NOACTIVATE：show() 不会激活窗口，
      // 避免激活中断资源管理器的 OLE 拖拽。
      focusable: false,
      show: false,
      hasShadow: false,
      title: '拖放目标',
      webPreferences: {
        spellcheck: false,
        // 禁止把文件放到窗口上时触发导航。
        navigateOnDragDrop: false,
      },
    })
    // 兜底：本窗口绝不导航、不开新窗口、不下载。
    this.win.webContents.on('will-navigate', (e) => e.preventDefault())
    this.win.webContents.on('will-redirect', (e) => e.preventDefault())
    this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    this.win.webContents.session.on('will-download', (e) => e.preventDefault())
    this.win.loadFile(path.join(this.ctx.app.VITE_PUBLIC, 'drop_zone.html'))
    return this.win
  }

  private setBounds(size: number) {
    const { x, y } = this.anchor
    this.rect = { x: x - size, y: y - size, w: size, h: size }
    // 注意 Rectangle 字段是 width/height，不是 w/h，否则只有位置生效、尺寸不变。
    this.win?.setBounds({ x: this.rect.x, y: this.rect.y, width: size, height: size })
  }

  private isHovered(cx: number, cy: number): boolean {
    const { x, y, w, h } = this.rect
    return w !== 0 && cx >= x && cx < x + w && cy >= y && cy < y + h
  }

  /// 一次拖拽承接会话：显示小窗 → 轮询光标 → 放大反馈 → 松开判定 → 回调。
  private async runDropSession(files: string[]) {
    if (this.active || !this.ctx.app.app.isReady()) return
    this.active = true
    this.abort = false
    try {
      const cursor = screen.getCursorScreenPoint()
      // 定位在光标所在显示器的工作区右下角（找不到则回退主显示器）。
      const wa = screen.getDisplayNearestPoint(cursor).workArea
      this.anchor = {
        x: wa.x + wa.width - MARGIN,
        y: wa.y + wa.height - MARGIN,
      }
      const win = this.getOrCreateWindow()
      this.setBounds(SMALL)
      win.show()

      const start = Date.now()
      let enlarged = false
      while (true) {
        const pt = screen.getCursorScreenPoint()
        // 光标进入窗口即放大一次，单调放大不缩回，避免边界振荡。
        if (!enlarged && this.isHovered(pt.x, pt.y)) {
          this.setBounds(LARGE)
          enlarged = true
        }
        const state = this.ctx.bindings.native.getDropInputState()
        if (state.escape || Date.now() - start > 60000) {
          // ESC 或超时：取消本次承接。
          this.abort = true
          break
        }
        if (!state.lbutton) break
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      const release = screen.getCursorScreenPoint()
      const confirmed = !this.abort && this.isHovered(release.x, release.y)

      win.hide()
      this.rect = { x: 0, y: 0, w: 0, h: 0 }

      if (confirmed) {
        await this.onConfirm(files)
      }
    } catch (e: any) {
      // 兜底：任何异常都确保窗口隐藏、状态复位。
      this.win?.hide()
      this.rect = { x: 0, y: 0, w: 0, h: 0 }
      this.ctx.emit('write-log', 'ERROR', `[拖放目标] ${e?.message ?? e}`)
    } finally {
      this.active = false
    }
  }

  private async onConfirm(files: string[]) {
    this.ctx.emit(
      'write-log',
      'INFO',
      `[拖放目标] 确认收到 ${files.length} 个文件:\n${files.join('\n')}`
    )
    try {
      const uploaded = await this.ctx.bindings.native.postFileFromFileList(files)
      this.ctx.emit(
        'write-log',
        'INFO',
        `[拖放目标] 上传完成，共 ${uploaded.length} 个文件`
      )
    } catch (e: any) {
      this.ctx.emit('write-log', 'ERROR', `[拖放目标] ${e?.message ?? e}`)
    }
  }
}

export { DropTarget }

import { Context, Service } from 'cordis'
import { globalShortcut, ipcMain } from 'electron'
import type { } from '../service/win'

declare module 'cordis' {
  interface Context {
    hotkey: Hotkey
  }
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
  }
}

class Hotkey extends Service {
  static inject = ['app', 'tray', 'win']

  constructor(ctx: Context) {
    super(ctx, 'hotkey')
    // 在构造函数中注册热键
    ctx.on('electron-ready', () => {
      this.registerHotkeys()
    })

    // 确保在应用退出时注销所有快捷键
    ctx.on('electron-dispose', () => {
      globalShortcut.unregisterAll()
    })
  }
  registerHotkeys() {
    // 示例：注册 Ctrl+Shift+A 快捷键
    const success = globalShortcut.register('CommandOrControl+Shift+C', () => {
      this.ctx.win.win?.webContents.openDevTools()
    })

    if (!success) {
      this.ctx.logger.error('hotkey register failed')
    } else {
      this.ctx.logger.info('hotkey register success')
    }
  }
}

export { Hotkey }

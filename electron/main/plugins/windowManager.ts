import { Context } from 'cordis'
import { BrowserWindow, Menu } from 'electron'
import type { } from '../service/tray'
import type { } from '../service/win'
import type { } from '../service/app'
import type { } from '../service/config'
import { BaseConfig } from '../../types'


declare module 'cordis' {
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
  }
}


class WindowManager {
  static inject = ['app', 'win', 'tray', 'configManager']
  constructor(ctx: Context) {
    ctx.logger.info('WindowManager initializing')
    // 创建窗口
    ctx.app.app.whenReady().then(async () => {
      ctx.emit('electron-ready')
      const baseConfig = ctx.configManager.getConfig('base') as BaseConfig
      ctx.win.createWindow(baseConfig)
      ctx.tray.createTray()
    })

    // 关闭窗口
    ctx.app.app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        ctx.tray.tray?.destroy()
        ctx.tray.tray = null
        ctx.win.win = null
        ctx.app.app.quit()
        ctx.emit('electron-dispose')
      }
    })

    // 修改点击托盘图标的逻辑
    ctx.tray.tray?.on('click', () => {
      if (ctx.win.win?.isVisible()) {
        ctx.win.win?.hide()
      } else {
        ctx.win.win?.show()
      }
    })

    ctx.app.app.on('second-instance', () => {
      if (ctx.win.win) {
        // Focus on the main window if the user tried to open another
        if (ctx.win.win.isMinimized()) ctx.win.win.restore()
        ctx.win.win.focus()
      }
    })

    ctx.app.app.on('activate', () => {
      const allWindows = BrowserWindow.getAllWindows()
      if (allWindows.length) {
        allWindows[0].focus()
      } else {
        const baseConfig = ctx.configManager.getConfig('base') as BaseConfig
        ctx.win.createWindow(baseConfig)
      }
    })
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '退出',
        click: () => {
          ctx.app.app.quit()
        }
      }
    ])
    ctx.tray.tray?.setContextMenu(contextMenu)
  }
}

export { WindowManager }
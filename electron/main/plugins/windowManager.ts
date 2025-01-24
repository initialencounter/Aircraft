import { Context } from 'cordis'
import { BrowserWindow, Menu } from 'electron'
import { } from '../service/tray'
import { } from '../service/win'
import { } from '../service/app'


declare module 'cordis' {
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
  }
}


class WindowManager {
  static inject = ['app', 'win', 'tray']
  constructor(ctx: Context) {
    // 创建窗口
    ctx.app.app.whenReady().then(async () => {
      ctx.emit('electron-ready')
      ctx.win.createWindow()
      ctx.tray.createTray()
      ctx.win.win?.webContents.on('will-navigate', (event, url) => {
        // 处理拖入文件的路径
        console.log('拖入的文件路径:', url);
      })
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
        ctx.win.createWindow()
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
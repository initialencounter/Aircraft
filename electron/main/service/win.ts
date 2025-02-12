import { Context, Service } from 'cordis'
import type { } from '../service/app'
import { BrowserWindow, shell } from 'electron'
import path from 'path'
import { BaseConfig } from '../../types'

declare module 'cordis' {
  interface Context {
    win: Window
  }
}

class Window extends Service {
  static inject = ['app']
  win: BrowserWindow | null
  constructor(ctx: Context) {
    super(ctx, 'win')
  }
  createWindow(config: BaseConfig) {
    this.ctx.logger.info('createWindow')
    this.win = new BrowserWindow({
      title: 'Aircraft',
      icon: path.join(this.ctx.app.VITE_PUBLIC, 'favicon.ico'),
      frame: false,
      transparent: true,
      show: !config.silent_start,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: this.ctx.app.preload,
        // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
        // nodeIntegration: true,

        // Consider using contextBridge.exposeInMainWorld
        // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
        // contextIsolation: false,
      },
    })
    if (this.ctx.app.VITE_DEV_SERVER_URL) { // #298
      this.win?.loadURL(this.ctx.app.VITE_DEV_SERVER_URL)
      // Open devTool if the app is not packaged
      // this.win?.webContents.openDevTools()
    } else {
      this.win?.loadFile(this.ctx.app.indexHtml)
    }

    // Test actively push message to the Electron-Renderer
    this.win?.webContents.on('did-finish-load', () => {
      this.win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    this.win?.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) shell.openExternal(url)
      return { action: 'deny' }
    })

  }
}

export { Window }

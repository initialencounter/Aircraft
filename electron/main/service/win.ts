import path from 'path'
import { globalShortcut } from 'electron'

import type { Context } from 'cordis'
import { Logger, Service } from 'cordis'
import type { } from '../service/app'
import { BrowserWindow, shell } from 'electron'

import type { BaseConfig } from 'aircraft-rs'

declare module 'cordis' {
  interface Context {
    win: Window
  }
}

export const logger = new Logger('win')

class Window extends Service {
  static inject = ['app']
  win!: BrowserWindow | null
  constructor(ctx: Context) {
    super(ctx, 'win')
  }
  async createWindow(config: BaseConfig) {
    this.win = new BrowserWindow({
      title: 'Aircraft',
      icon: path.join(this.ctx.app.VITE_PUBLIC, 'favicon.ico'),
      frame: false,
      transparent: true,
      show: !config.silentStart,
      titleBarStyle: 'hidden',
      alwaysOnTop: true,
      webPreferences: {
        preload: this.ctx.app.preload,
        spellcheck: false, // 禁用拼写检查
        enableWebSQL: false, // 禁用 WebSQL
        disableDialogs: true, // 禁用对话框
        // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
        // nodeIntegration: true,

        // Consider using contextBridge.exposeInMainWorld
        // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
        // contextIsolation: false,
      },
    })
    if (this.ctx.app.VITE_DEV_SERVER_URL) {
      // #298
      await this.win?.loadURL(this.ctx.app.VITE_DEV_SERVER_URL)
      this.ctx.emit(
        'write-log',
        'INFO',
        'VITE_DEV_SERVER_URL' + this.ctx.app.VITE_DEV_SERVER_URL
      )
      // Open devTool if the app is not packaged
      // this.win?.webContents.openDevTools()
      globalShortcut.register('CommandOrControl+Shift+C', () => {
        this.ctx.win.win?.webContents.openDevTools()
      })
    } else {
      await this.win?.loadFile(this.ctx.app.indexHtml)
    }

    // Test actively push message to the Electron-Renderer
    this.win?.webContents.on('did-finish-load', () => {
      this.win?.webContents.send(
        'main-process-message',
        new Date().toLocaleString()
      )
    })

    // Make all links open with the browser, not with the application
    this.win?.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) shell.openExternal(url)
      return { action: 'deny' }
    })
  }
}

export { Window }

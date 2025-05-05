import type { Context } from 'cordis'
import { Service } from 'cordis'
import { BrowserWindow, ipcMain } from 'electron'

import { formatLogMessage } from './logger'

declare module 'cordis' {
  interface Context {
    ipc: Ipc
  }
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
  }
}

class Ipc extends Service {
  static inject = [
    'app',
    'win',
    'configManager',
    'loggerService',
    'llm',
    'core',
    'bindings',
  ]
  constructor(ctx: Context) {
    super(ctx, 'ipc')
    ctx.on('electron-ready', () => {
      this.registerIpc()
    })
  }
  registerIpc() {
    this.ctx.logger.info('registerIpc')
    // New window example arg: new windows url
    ipcMain.handle('open-win', (_, arg) => {
      this.ctx.win.win = new BrowserWindow({
        webPreferences: {
          preload: this.ctx.app.preload,
          nodeIntegration: true,
          contextIsolation: false,
        },
      })
      if (this.ctx.app.VITE_DEV_SERVER_URL) {
        this.ctx.win.win.loadURL(`${this.ctx.app.VITE_DEV_SERVER_URL}#${arg}`)
      } else {
        this.ctx.win.win.loadFile(this.ctx.app.indexHtml, { hash: arg })
      }
    })
    ipcMain.handle('set-window-draggable', (_, isDraggable: boolean) => {
      this.ctx.win.win?.setMovable(isDraggable)
    })
    ipcMain.handle('minimize_window', () => {
      this.ctx.win.win?.minimize()
      this.ctx.logger.info('minimize window')
    })

    ipcMain.handle('hide_window', () => {
      this.ctx.win.win?.hide()
      this.ctx.logger.info('hide window')
    })

    ipcMain.handle('get_server_logs', async () => {
      const logs = this.ctx.loggerService.tryGetLogs()
      return logs.map(formatLogMessage)
    })
    ipcMain.handle(`save_config`, async (_, { config }) => {
      this.ctx.configManager.saveConfig(config)
    })
    ipcMain.handle(`get_config`, async () => {
      return this.ctx.configManager.getConfig()
    })
    ipcMain.handle('reload_config', async (_, { config }) => {
      this.ctx.configManager.reloadConfig(config)
    })

    ipcMain.handle(
      'get_report_summary_by_buffer',
      async (_, { base64String }) => {
        return await this.ctx.llm.uploadLLMFiles(
          Buffer.from(base64String, 'base64')
        )
      }
    )
    ipcMain.handle(
      'get_summary_info_by_buffer',
      async (_, { base64String }) => {
        return await this.ctx.core.getSummaryInfoByBuffer(
          Buffer.from(base64String, 'base64')
        )
      }
    )
  }
}

export { Ipc }

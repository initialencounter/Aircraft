import type { Context } from 'cordis'
import { Service } from 'cordis'
import { BrowserWindow, ipcMain } from 'electron'

import type { Config as ConfigType } from '../../types'
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
    // 修改用于开机自启的 ipcMain 处理程序
    this.ctx.logger.info('get_base_config called')
    ipcMain.handle('get_server_logs', async () => {
      const logs = this.ctx.loggerService.tryGetLogs()
      return logs.map(formatLogMessage)
    })
    const configKey: (keyof ConfigType)[] = ['base', 'server', 'llm']
    configKey.forEach((key) => {
      ipcMain.handle(`save_${key}_config`, async (_, config) => {
        this.ctx.configManager.saveConfig(config, key)
      })
      ipcMain.handle(`get_${key}_config`, async () => {
        return this.ctx.configManager.getConfig(key)
      })
    })
    ipcMain.handle('get_hotkey_config', async () => {
      this.ctx.logger.info('get_hotkey_config called')
    })
    ipcMain.handle('get_report_summary_by_buffer', async (_, data: string) => {
      return await this.ctx.llm.uploadLLMFiles(Buffer.from(data, 'base64'))
    })
    ipcMain.handle('get_summary_info_by_buffer', async (_, data: string) => {
      return await this.ctx.attachment.getSummaryInfoByBuffer(
        Buffer.from(data, 'base64')
      )
    })
  }
}

export { Ipc }

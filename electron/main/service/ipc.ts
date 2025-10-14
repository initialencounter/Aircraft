import type { Context } from 'cordis'
import { Service } from 'cordis'
import { BrowserWindow, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { SearchResult } from 'aircraft-rs'

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
    this.ctx.emit('write-log', 'INFO', 'registerIpc')
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
      this.ctx.emit('write-log', 'INFO', 'minimize window')
    })

    ipcMain.handle('maximize_window', () => {
      this.ctx.win.win?.maximize()
      this.ctx.emit('write-log', 'INFO', 'maximize window')
    })

    ipcMain.handle('unmaximize_window', () => {
      this.ctx.win.win?.unmaximize()
      this.ctx.emit('write-log', 'INFO', 'unmaximize window')
    })

    ipcMain.handle('hide_window', () => {
      this.ctx.win.win?.hide()
      this.ctx.emit('write-log', 'INFO', 'hide window')
    })

    ipcMain.handle('get_server_logs', async () => {
      return this.ctx.loggerService.tryGetLogs()
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

    ipcMain.handle('open_local_dir', (_, { target }) => {
      this.openLocalDir(target)
    })

    ipcMain.handle('search_file', async (_, { fileName }) => {
      return await this.ctx.bindings.native.searchFile(fileName) as SearchResult[]
    })
  }

  private openLocalDir(target: string) {
    console.log('open_local_dir:', target)

    if (!fs.existsSync(target)) {
      console.error('Path does not exist:', target)
      return
    }

    const stats = fs.statSync(target)

    if (stats.isDirectory()) {
      // 如果是目录，直接打开目录
      if (process.platform === 'win32') {
        spawn('explorer', [target], { detached: true })
      } else if (process.platform === 'darwin') {
        spawn('open', [target], { detached: true })
      } else if (process.platform === 'linux') {
        spawn('xdg-open', [target], { detached: true })
      }
    } else {
      // 如果是文件，打开文件所在的目录
      const parentDir = path.dirname(target)
      if (process.platform === 'win32') {
        spawn('explorer', [parentDir], { detached: true })
      } else if (process.platform === 'darwin') {
        spawn('open', [parentDir], { detached: true })
      } else if (process.platform === 'linux') {
        spawn('xdg-open', [parentDir], { detached: true })
      }
    }
  }
}

export { Ipc }

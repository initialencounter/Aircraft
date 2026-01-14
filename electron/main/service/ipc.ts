import { Config } from 'aircraft-rs'
import type { Context } from 'cordis'
import { Service } from 'cordis'
import { BrowserWindow, ipcMain } from 'electron'

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
    'loggerService',
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

    ipcMain.handle('open_local_dir', (_, { target }) => {
      return this.ctx.bindings.native.openLocalDir(target)
    })

    ipcMain.handle('get_login_status', async () => {
      return this.ctx.bindings.native.getLoginStatus()
    })

    ipcMain.handle('get_server_port', async () => {
      return this.ctx.bindings.native.getServerPort()
    })

    ipcMain.handle('reload_config', (_, config: Config) => {
      this.ctx.emit('auto-launch-switch', config.base.autoStart, config.base.silentStart)
    })
  }

}

export { Ipc }

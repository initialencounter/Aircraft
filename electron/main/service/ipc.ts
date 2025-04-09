import { Context, Service } from 'cordis'
import { BrowserWindow, ipcMain } from 'electron'
import type { Config as ConfigType } from '../../types'
import type { } from '../service/config'
import type { } from '../service/win'
import type { } from '../service/llm'
import { formatLogMessage } from '../service/logger'

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
  static inject = ['app', 'win', 'configManager', 'loggerService', 'llm']
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
      this.ctx.win.win?.setMovable(isDraggable);
    });
    ipcMain.handle('minimize_window', () => {
      this.ctx.win.win?.minimize();
      this.ctx.logger.info('minimize window');
    });

    ipcMain.handle('hide_window', () => {
      this.ctx.win.win?.hide();
      this.ctx.logger.info('hide window');
    });
    // 修改用于开机自启的 ipcMain 处理程序
    this.ctx.logger.info('get_base_config called')
    ipcMain.handle('get_server_logs', async () => {
      let logs = this.ctx.loggerService.tryGetLogs();
      return logs.map(formatLogMessage);
    });
    const configKey: (keyof ConfigType)[] = ['base', 'server', 'llm'];
    configKey.forEach(key => {
      ipcMain.handle(`save_${key}_config`, async (_, config) => {
        this.ctx.configManager.saveConfig(config, key);
      });
      ipcMain.handle(`get_${key}_config`, async () => {
        return this.ctx.configManager.getConfig('base');
      });
    })
    ipcMain.handle('switch_drag_to_blake2', async () => {
      this.ctx.logger.info('switch_drag_to_blake2 called')
    })
    ipcMain.handle('get_hotkey_config', async () => {
      this.ctx.logger.info('get_hotkey_config called')
    })
    ipcMain.handle('summary_report', async (_, data: ArrayBuffer) => {
      let res = await this.ctx.llm.uploadLLMFiles(Buffer.from(data))
      return res
    })
  }
}

export { Ipc }

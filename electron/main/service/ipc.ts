import { Context, Service } from 'cordis'
import { BrowserWindow, ipcMain } from 'electron'
import { BaseConfig, ServerConfig } from '../../types'
import { } from '../service/config'

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
  static inject = ['app', 'win', 'configManager']
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
    ipcMain.handle('window-minimize', () => {
      this.ctx.win.win?.minimize();
      this.ctx.logger.info('window-minimize');
    });

    ipcMain.handle('window-hide', () => {
      this.ctx.win.win?.hide();
      this.ctx.logger.info('window-hide');
    });

    ipcMain.handle('window-show', () => {
      this.ctx.win.win?.show();
      this.ctx.logger.info('window-show');
    });

    // 修改用于开机自启的 ipcMain 处理程序
    ipcMain.handle('save_base_config', async (_, config: BaseConfig) => {
      this.ctx.configManager.saveBaseConfig(config);
    });
    ipcMain.handle('get_base_config', async () => {
      return this.ctx.configManager.getBaseConfig();
    });
    this.ctx.logger.info('get_base_config called')
    ipcMain.handle('save_server_config', async (_, config: ServerConfig) => {
      this.ctx.configManager.saveServerConfig(config);
    });
    ipcMain.handle('get_server_config', async () => {
      return this.ctx.configManager.getServerConfig();
    });

    ipcMain.handle('get_server_logs', async () => {
      return [];
    });
  }
}

export { Ipc }

import { app } from 'electron'
import { Tray, Menu } from 'electron'
import path from 'path'
import { Context, Service } from 'cordis'
import { } from './log'

declare module 'cordis' {
  interface Context {
    tray: CustomTray
  }
}

class CustomTray extends Service {
  static inject = ['app']
  tray: Tray | null
  constructor(ctx: Context) {
    super(ctx, 'tray')
  }
  createTray() {
    if (!this.ctx.app.VITE_PUBLIC) {
      this.ctx.log.error('VITE_PUBLIC is not set');
    }
    this.tray = new Tray(path.join(this.ctx.app.VITE_PUBLIC, 'favicon.ico'))
    this.tray.setToolTip('Aircraft')
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '退出',
        click: () => {
          this.ctx.app.app.quit()
        }
      }
    ])
    this.tray.setContextMenu(contextMenu)
  }
}

export { CustomTray }
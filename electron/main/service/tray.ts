import { Tray, Menu } from 'electron'
import path from 'path'
import { Context, Service } from 'cordis'
import type { } from '../service/app'
import type { } from '../service/win'

declare module 'cordis' {
  interface Context {
    tray: CustomTray
  }
}

class CustomTray extends Service {
  static inject = ['app', 'win']
  tray: Tray | null
  constructor(ctx: Context) {
    super(ctx, 'tray')
  }
  createTray() {
    if (!this.ctx.app.VITE_PUBLIC) {
      this.ctx.logger.error('VITE_PUBLIC is not set');
    }
    this.tray = new Tray(path.join(this.ctx.app.VITE_PUBLIC, 'favicon.ico'))
    this.tray.setToolTip('Aircraft')
    this.tray.on('click', () => {
      if (this.ctx.win.win?.isVisible()) {
        this.ctx.win.win?.hide()
      } else {
        this.ctx.win.win?.show()
      }
    })
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
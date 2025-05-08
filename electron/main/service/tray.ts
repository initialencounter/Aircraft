import path from 'path'

import { Tray, Menu, BrowserWindow } from 'electron'
import type { Context } from 'cordis'
import { Service } from 'cordis'
import type {} from '../service/app'
import type {} from '../service/win'
import type {} from '@cordisjs/plugin-http'

declare module 'cordis' {
  interface Context {
    tray: CustomTray
  }
}

class CustomTray extends Service {
  static inject = ['app', 'win', 'http']
  tray: Tray | null
  constructor(ctx: Context) {
    super(ctx, 'tray')
  }
  createTray() {
    if (!this.ctx.app.VITE_PUBLIC) {
      this.ctx.emit('write-log', 'ERROR', 'VITE_PUBLIC is not set')
    }
    const icon = path.join(this.ctx.app.VITE_PUBLIC, 'favicon.ico')
    this.tray = new Tray(icon)
    this.tray.setToolTip('Aircraft')
    this.tray.on('click', () => {
      if (this.ctx.win.win?.isVisible()) {
        this.ctx.win.win?.hide()
      } else {
        this.ctx.win.win?.show()
      }
    })
    const contextMenu = Menu.buildFromTemplate([
      //   let help_ = MenuItemBuilder::new("帮助(H)").id("help").build(app).unwrap();
      // let quit = MenuItemBuilder::new("退出(X)").id("quit").build(app).unwrap();
      // let hide = MenuItemBuilder::new("隐藏(H)").id("hide").build(app).unwrap();
      // let about = MenuItemBuilder::new("关于(A)").id("about").build(app).unwrap();
      // let update = MenuItemBuilder::new("检查更新(U)").id("update").build(app).unwrap();
      // let restart_ = MenuItemBuilder::new("重启(R)").id("restart").build(app).unwrap();
      {
        label: '帮助(H)',
        click: () => {
          new BrowserWindow({
            icon: icon,
            show: true,
          }).loadURL(
            'https://github.com/initialencounter/Aircraft?tab=readme-ov-file#使用帮助'
          )
        },
      },
      {
        label: '退出(X)',
        click: () => {
          this.ctx.app.app.quit()
        },
      },
      {
        label: '隐藏(H)',
        click: () => {
          this.ctx.win.win?.hide()
        },
      },

      {
        label: '关于(A)',
        click: () => {
          new BrowserWindow({
            icon: icon,
            show: true,
          }).loadURL('https://github.com/initialencounter/Aircraft')
        },
      },
      {
        label: '检查更新(U)',
        click: async () => {
          await new BrowserWindow({
            icon: icon,
            show: true,
          }).loadURL(
            'https://github.com/initialencounter/Aircraft/releases/latest'
          )
        },
      },
    ])
    this.tray.setContextMenu(contextMenu)
  }
}

export { CustomTray }

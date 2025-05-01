import os from 'node:os'
import path from 'path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import Electron from 'electron'
import type { Context } from 'cordis'
import { Service, Logger } from 'cordis'

declare module 'cordis' {
  interface Context {
    app: App
  }
}

class App extends Service {
  app: Electron.App
  require: typeof createRequire
  __dirname: string
  APP_ROOT: string
  MAIN_DIST: string
  RENDERER_DIST: string
  VITE_DEV_SERVER_URL: string
  VITE_PUBLIC: string
  APP_DATA_PATH: string
  APP_CONFIG_PATH: string
  preload: string
  indexHtml: string
  logger: Logger
  ICON_PATH: string
  constructor(ctx: Context) {
    super(ctx, 'app')
    this.require = createRequire(import.meta.url)
    this.__dirname = path.dirname(fileURLToPath(import.meta.url))
    this.APP_ROOT = path.join(this.__dirname, '../..')

    this.MAIN_DIST = path.join(this.APP_ROOT, 'dist-electron')
    this.RENDERER_DIST = path.join(this.APP_ROOT, 'dist')
    this.VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || ''

    this.VITE_PUBLIC = this.VITE_DEV_SERVER_URL
      ? path.join(this.APP_ROOT, 'public')
      : this.RENDERER_DIST

    this.preload = path.join(this.__dirname, '../preload/index.mjs')
    this.indexHtml = path.join(this.RENDERER_DIST, 'index.html')

    this.app = Electron.app
    this.APP_DATA_PATH = this.app.getPath('appData')
    this.APP_CONFIG_PATH = path.join(this.APP_DATA_PATH, this.app.getName())
    // Disable GPU Acceleration for Windows 7
    if (os.release().startsWith('6.1')) this.app.disableHardwareAcceleration()

    // Set application name for Windows 10+ notifications
    if (process.platform === 'win32')
      this.app.setAppUserModelId(this.app.getName())

    if (!this.app.requestSingleInstanceLock()) {
      this.app.quit()
      process.exit(0)
    }
    this.logger = new Logger('app')
  }
}

export { App }

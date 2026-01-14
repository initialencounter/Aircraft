import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-server'
import type {} from '../service/bindings'
import type { AircraftRs } from 'aircraft-rs'
import { resolve } from 'path'

declare module 'cordis' {
  interface Context {
    core: AircraftCore
  }
  interface Events {
    'write-log': (level: string, message: string) => void
    'reload_clipboard_snapshot_configs': () => void
  }
}

class AircraftCore extends Service {
  static inject = ['http', 'app', 'bindings']
  core!: AircraftRs
  constructor(ctx: Context) {
    super(ctx, 'core')
    const loggerDir = resolve(ctx.app.APP_CONFIG_PATH, 'logs')
    // 初始化 AircraftRs 实例
    this.core = new ctx.bindings.native.AircraftRs(loggerDir)
  }
}

export { AircraftCore }

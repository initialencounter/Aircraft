import { resolve } from 'path'

import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-server'
import type {} from '../service/bindings'
import type {
  AircraftRs,
  AttachmentInfo,
  SummaryInfo,
} from 'aircraft-rs'

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
  bindings!: AircraftRs
  constructor(ctx: Context) {
    super(ctx, 'core')
    const loggerDir = resolve(ctx.app.APP_CONFIG_PATH, 'logs')
    ctx.inject(['configManager'], (ctx) => {
      const config = ctx.configManager.getConfig()
      this.bindings = new ctx.bindings.native.AircraftRs(
        loggerDir,
        config.server,
        config.llm,
        config.hotkey
      )
      // 启动核心服务
      this.bindings.startServer()
      this.bindings.startClipboardSnapshotManager()
    })

    ctx.on('reload_clipboard_snapshot_configs', async () => {
      ctx.emit('write-log', 'INFO', 'Reloading Clipboard Snapshot Configs...')
      this.bindings
        .reloadClipboardSnapshotConfigs()
    })
  }

  async getAttachmentInfo(
    projectNo: string,
    is_965: boolean
  ): Promise<AttachmentInfo> {
    return await this.bindings.getAttachmentInfo(projectNo, is_965)
  }

  async getSummaryInfoByBuffer(buffer: Buffer): Promise<SummaryInfo> {
    return this.bindings.getSummaryInfoByBuffer(buffer)
  }
}

export { AircraftCore }

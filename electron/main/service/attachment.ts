import { resolve } from 'path'

import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-server'
import type {} from '../service/bindings'
import type { AircraftRs, AttachmentInfo, SummaryInfo } from 'aircraft-rs'

declare module 'cordis' {
  interface Context {
    attachment: Attachment
  }
}

class Attachment extends Service {
  static inject = ['http', 'app', 'bindings', 'configManager']
  bindings: AircraftRs
  constructor(ctx: Context) {
    super(ctx, 'attachment')
    const loggerDir = resolve(ctx.app.APP_CONFIG_PATH, 'logs')
    const serverConfig = ctx.configManager.getConfig('server')
    const llmConfig = ctx.configManager.getConfig('llm')
    this.bindings = new ctx.bindings.bindings.AircraftRs(
      loggerDir,
      serverConfig,
      llmConfig
    )
  }

  async getAttachmentInfo(
    projectNo: string,
    is_965: boolean
  ): Promise<AttachmentInfo> {
    return await this.bindings.getAttachmentInfo(projectNo, is_965)
  }

  async getSummaryInfoByBuffer(buffer: Buffer): Promise<SummaryInfo> {
    const u8 = Array.from(buffer)
    return this.bindings.getSummaryInfoByBuffer(u8)
  }
}

export { Attachment }

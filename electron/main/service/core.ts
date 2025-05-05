import { resolve } from 'path'

import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-server'
import type {} from '../service/bindings'
import type {
  AircraftRs,
  AttachmentInfo,
  HotkeyConfig,
  LLMConfig,
  ServerConfig,
  SummaryInfo,
} from 'aircraft-rs'

declare module 'cordis' {
  interface Context {
    core: AircraftCore
  }
  interface Events {
    'reload-server': (serverConfig: ServerConfig, llmConfig: LLMConfig) => void
    'reload-llm': (llmConfig: LLMConfig) => void
    'reload-hotkey': (hotkey: HotkeyConfig) => void
  }
}

class AircraftCore extends Service {
  static inject = ['http', 'app', 'bindings']
  bindings: AircraftRs
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
      this.bindings.startHotkey()
    })

    ctx.on('reload-server', async (serverConfig, llmConfig) => {
      ctx.logger.info('Reloading Server Config...')
      this.bindings.reloadServer(serverConfig, llmConfig)
    })
    ctx.on('reload-hotkey', async (hotkey: HotkeyConfig) => {
      ctx.logger.info('Reloading Hotkey Config...')
      this.bindings.reloadHotkey(hotkey)
    })
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

export { AircraftCore }

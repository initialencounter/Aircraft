import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-server'
import type { Attachment } from '../service/attachment'
import type { LLM } from '../service/llm'

declare module 'cordis' {
  interface Context {
    attachment: Attachment
    llm: LLM
  }
}

class AircraftServer extends Service {
  static inject = ['attachment']

  constructor(ctx: Context) {
    super(ctx, 'aircraftServer')
    ctx.attachment.bindings.startServer()
  }
}

export { AircraftServer }

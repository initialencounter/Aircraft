import type { Context } from 'cordis'
import { Service } from 'cordis'

import type AircraftRs from 'aircraft-rs'
import type { Config } from 'aircraft-rs'

declare module 'cordis' {
  interface Context {
    bindings: RustBindings
  }
  interface Events {
    'get-default-config'(): Config
  }
}

class RustBindings extends Service {
  static inject = ['app']
  native: typeof AircraftRs
  bindingsPath: string
  constructor(ctx: Context) {
    super(ctx, 'bindings')
    //@ts-ignore
    this.native = this.ctx.app.require('aircraft-rs')
  }
}

export { RustBindings }

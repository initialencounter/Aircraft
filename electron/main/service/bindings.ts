import type { Context } from 'cordis'
import { Service } from 'cordis'

import type AircraftRs from 'aircraft-rs'

declare module 'cordis' {
  interface Context {
    bindings: RustBindings
  }
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
  }
}

class RustBindings extends Service {
  static inject = ['app']
  bindings: typeof AircraftRs
  bindingsPath: string
  constructor(ctx: Context) {
    super(ctx, 'bindings')
    //@ts-ignore
    this.bindings = this.ctx.app.require('aircraft-rs')
  }
}

export { RustBindings }

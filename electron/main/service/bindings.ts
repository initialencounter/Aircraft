import { Context, Service } from "cordis";
import type AircraftRs from "../../../bindings/node";
import path from "path";
import { fileURLToPath } from 'node:url'

declare module 'cordis' {
  interface Context {
    bindings: RustBindings
  }
  interface Events {
    'electron-ready': () => void
    'electron-dispose': () => void
    'bindings-ready': () => void
  }
}


class RustBindings extends Service {
  bindings: typeof AircraftRs;
  bindingsPath: string;
  constructor(ctx: Context) {
    super(ctx, 'bindings')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const APP_ROOT = path.join(__dirname, '../..')
    this.bindingsPath = path.join(APP_ROOT, 'bindings/node/index.js')
    ctx.on('ready', async () => {
      this.bindings = await import(`file://${this.bindingsPath}`) as typeof AircraftRs;
      ctx.emit('bindings-ready')
    })
  }
}

export { RustBindings }
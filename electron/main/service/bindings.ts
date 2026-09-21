import path from 'node:path'
import { app } from 'electron'
import type { Context } from 'cordis'
import { Service } from 'cordis'

import type AircraftRs from 'aircraft-rs'
import type { Config } from 'aircraft-rs'

// pdfium 与 onnxruntime 都是运行期按需 dlopen 的，查找链末端的兜底是「exe 所在目录」。
// 开发态的 exe 是 node_modules/electron/dist/electron.exe，不在仓库内，兜底必然落空
// （.cargo/config.toml 里的 env 只对 cargo 启动的进程生效），所以这里显式指向仓库内的副本。
// 打包后 exe 就在安装根目录，两个 DLL 已由 extraFiles 放在同级，不设变量也能命中。
if (!app.isPackaged) {
  const repoRoot = path.resolve(__dirname, '../../..')
  process.env.PDFIUM_LIB_PATH ??= path.join(
    repoRoot,
    'firecrawl-pdfium-win-x64/bin/pdfium.dll'
  )
  process.env.ORT_DYLIB_PATH ??= path.join(
    repoRoot,
    'onnxruntime-win-x64-1.27.0/lib/onnxruntime.dll'
  )
}

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
  bindingsPath!: string
  constructor(ctx: Context) {
    super(ctx, 'bindings')
    //@ts-ignore
    this.native = this.ctx.app.require('aircraft-rs')
  }
}

export { RustBindings }

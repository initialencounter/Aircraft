import { Context } from 'cordis'
import Undios from '@cordisjs/plugin-http'

import { AircraftCore } from './service/core'
import { App } from './service/app'
import { WindowManager } from './plugins/windowManager'
import { CustomTray as Tray } from './service/tray'
import { Window } from './service/win'
import { Ipc } from './service/ipc'
import { Hotkey } from './service/hotkey'
import { ConfigManager } from './service/config'
import { RustBindings } from './service/bindings'
import { LoggerService } from './service/logger'
import { Launch } from './plugins/launch'
import { LLM } from './service/llm'

const context = new Context()
context.plugin(Undios)
context.plugin(RustBindings)
context.plugin(AircraftCore)
context.plugin(App)
context.plugin(Window)
context.plugin(Tray)
context.plugin(WindowManager)
context.plugin(ConfigManager)
context.plugin(Hotkey)
context.plugin(Ipc)
context.plugin(LoggerService)
context.plugin(Launch)
context.plugin(LLM)
export { context }

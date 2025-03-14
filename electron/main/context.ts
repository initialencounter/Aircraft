import { Context } from 'cordis'
import Undios from '@cordisjs/plugin-http'
import Router from '@cordisjs/plugin-server'
import { Attachment } from './service/attachment'
import { App } from './service/app'
import { WindowManager } from './plugins/windowManager'
import { CustomTray as Tray } from './service/tray'
import { Window } from './service/win'
import { Ipc } from './service/ipc'
import { Hotkey } from './service/hotkey'
import { ConfigManager } from './service/config'
import { RustBindings } from './service/bindings'
import { LoggerService } from './service/logger'
import { AircraftServer } from './service/server'
import { Launch } from './plugins/launch'

const context = new Context()
context.plugin(Undios)
context.plugin(Router, {
  port: 25455,
  host: '0.0.0.0',
})
context.plugin(RustBindings)
context.plugin(Attachment)
context.plugin(App)
context.plugin(Window)
context.plugin(Tray)
context.plugin(WindowManager)
context.plugin(ConfigManager)
context.plugin(Hotkey)
context.plugin(Ipc)
context.plugin(LoggerService)
context.plugin(AircraftServer)
context.plugin(Launch)
export { context }

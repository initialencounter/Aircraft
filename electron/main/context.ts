import { Context } from 'cordis'
import Undios from '@cordisjs/plugin-http'
import Router from '@cordisjs/plugin-server'
import { Attachment } from './plugins/attachment'
import { App } from './service/app'
import { WindowManager } from './plugins/windowManager'
import { CustomTray as Tray } from './service/tray'
import { Window } from './service/win'
import { Logger } from './service/log'
import { Ipc } from './service/ipc'
import { Hotkey } from './service/hotkey'
import { Config } from './service/config'
import { RustBindings } from './service/bindings'

const context = new Context()
context.plugin(Logger)
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
context.plugin(Config)
context.plugin(Hotkey)
context.plugin(Ipc)

export { context }

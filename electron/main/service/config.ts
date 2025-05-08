import { readFileSync, writeFileSync } from 'fs'
import { existsSync } from 'fs'
import path from 'path'

import type { Context } from 'cordis'
import { Service, Logger } from 'cordis'

import type {} from '../service/app'
import type { Config } from 'aircraft-rs'
import { ConfigSchema } from '@aircraft/renderer/src/schema'

declare module 'cordis' {
  interface Context {
    configManager: ConfigManager
  }
  interface Events {
    'auto-launch-switch': (auto_start: boolean, silent_start: boolean) => void
  }
}

export function shallowEqual(obj1: any, obj2: any) {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false
    }
  }

  return true
}

const logger = new Logger('configManager')

class ConfigManager extends Service {
  static inject = ['app', 'bindings', 'core']
  configFilePath: string
  constructor(ctx: Context) {
    super(ctx, 'configManager')
    this.configFilePath = path.join(this.ctx.app.APP_CONFIG_PATH, 'config.json')
    ctx.on('ready', () => {
      ctx.emit('write-log', 'INFO', 'configManager initializing')
      this.init()
    })
  }
  init() {
    if (!existsSync(this.configFilePath)) {
      this.ctx.emit('write-log', 'WARN', 'config file not found, creating new config file')
      try {
        writeFileSync(
          this.configFilePath,
          JSON.stringify(this.getDefaultConfig())
        )
      } catch (error) {
        this.ctx.emit('write-log', 'ERROR', 'config file create error')
      }
    }
  }
  getDefaultConfig() {
    return this.ctx.bindings.native.getDefaultConfig()
  }
  getConfig(): Config {
    let config: Config
    try {
      const rawConfig = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
      config = new ConfigSchema(rawConfig)
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'config file parse error' + error)
      config = this.getDefaultConfig()
    }
    return config
  }
  saveConfig(config: Config) {
    try {
      writeFileSync(this.configFilePath, JSON.stringify(config, null, 2))
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'config file save error' + error)
    }
  }
  reloadConfig(config: Config) {
    try {
      const currentServerConfig =
        this.ctx.core.bindings.getCurrentServerConfig()
      if (!shallowEqual(currentServerConfig, config.server)) {
        this.ctx.emit('reload-server', config.server, config.llm)
      }
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'Server config file reload error' + error)
    }
    try {
      const currentLlmConfig = this.ctx.core.bindings.getCurrentLlmConfig()
      if (!shallowEqual(currentLlmConfig, config.llm)) {
        this.ctx.emit('reload-llm', config.llm)
      }
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'LLM config file reload error' + error)
    }
    try {
      const currentHotkeyConfig =
        this.ctx.core.bindings.getCurrentHotkeyConfig()
      if (!shallowEqual(currentHotkeyConfig, config.hotkey)) {
        this.ctx.emit('reload-hotkey', config.hotkey)
      }
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'Hotkey config file save error' + error)
    }
    try {
      this.ctx.emit(
        'auto-launch-switch',
        config.base.autoStart,
        config.base.silentStart
      )
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'base file reload error'+error)
    }
    try {
      this.saveConfig(config)
    } catch (error) {
      this.ctx.emit('write-log', 'ERROR', 'config file save error')
    }
  }
}

export { ConfigManager }

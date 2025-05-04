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
      logger.info('configManager initializing')
      this.init()
    })
  }
  init() {
    if (!existsSync(this.configFilePath)) {
      logger.warn('config file not found, creating new config file')
      try {
        writeFileSync(
          this.configFilePath,
          JSON.stringify(this.getDefaultConfig())
        )
      } catch (error) {
        logger.error('config file create error', error)
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
      logger.error('config file parse error', error)
      config = this.getDefaultConfig()
    }
    return config
  }
  saveConfig(config: Config) {
    try {
      writeFileSync(this.configFilePath, JSON.stringify(config, null, 2))
    } catch (error) {
      logger.error('config file save error', error)
    }
  }
  reloadConfig(config: Config) {
    try {
      const currentServerConfig = this.ctx.core.bindings.getCurrentServerConfig()
      if (!shallowEqual(currentServerConfig, config.server)) {
        this.ctx.emit('reload-server', config.server, config.llm)
      }
    } catch (error) {
      logger.error('Server config file reload error', error)
    }
    try {
      const currentLlmConfig = this.ctx.core.bindings.getCurrentLlmConfig()
      if (!shallowEqual(currentLlmConfig, config.llm)) {
        this.ctx.emit('reload-llm', config.llm)
      }
    } catch (error) {
      logger.error('LLM config file reload error', error)
    }
    try {
      const currentHotkeyConfig = this.ctx.core.bindings.getCurrentHotkeyConfig()
      if (!shallowEqual(currentHotkeyConfig, config.hotkey)) {
        this.ctx.emit('reload-hotkey', config.hotkey)
      }
    } catch (error) {
      logger.error('Hotkey config file save error', error)
    }
    try {
      this.ctx.emit(
        'auto-launch-switch',
        config.base.autoStart,
        config.base.silentStart
      )
    } catch (error) {
      logger.error('base file reload error', error)
    }
    try {
      this.saveConfig(config)
    } catch (error) {
      logger.error('config file save error', error)
    }
  }
}

export { ConfigManager }

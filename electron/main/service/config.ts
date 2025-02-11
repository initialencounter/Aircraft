import { Context, Service, Logger } from 'cordis'
import { readFileSync, writeFileSync } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import { Config as ConfigType } from '../../types/index'
import { } from '../service/app'

declare module 'cordis' {
  interface Context {
    configManager: ConfigManager
  }
}

const logger = new Logger('configManager')

class ConfigManager extends Service {
  static inject = ['app']
  configFilePath: string
  constructor(ctx: Context) {
    super(ctx, 'configManager')
    this.configFilePath = path.join(this.ctx.app.APP_CONFIG_PATH, 'config.json')
    this.ctx.logger.info('configFilePath', this.configFilePath)
    ctx.on('ready', () => {
      logger.info('configManager initializing')
      this.init()
    })
  }
  init() {
    if (!existsSync(this.configFilePath)) {
      logger.warn('config file not found, creating new config file')
      try {
        writeFileSync(this.configFilePath, JSON.stringify(this.getDefaultConfig()))
      } catch (error) {
        logger.error('config file create error', error)
      }
    }
    logger.success('config init success')
  }
  getDefaultConfig() {
    return {
      server: {
        base_url: '',
        username: '',
        password: '',
        port: 25455,
        debug: false,
        log_enabled: false,
      },
      base: {
        auto_start: false,
        silent_start: false,
        nothing: '',
      },
    }
  }
  getConfig(configName: keyof ConfigType) {
    let config: ConfigType
    try {
      config = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
    } catch (error) {
      logger.error('config file parse error', error)
      config = this.getDefaultConfig()
    }
    return config[configName]
  }
  saveConfig<T extends keyof ConfigType>(config: ConfigType[T], configName: T) {
    try {
      const oldConfig: ConfigType = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
      oldConfig[configName] = config
      writeFileSync(this.configFilePath, JSON.stringify(oldConfig))
    } catch (error) {
      logger.error('config file save error', error)
    }
  }
}

export { ConfigManager }
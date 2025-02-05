import { Context, Service, Logger } from 'cordis'
import { readFileSync, writeFileSync } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import { ServerConfig, BaseConfig, Config as ConfigType } from '../../types/index'
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
    this.configFilePath = path.join(this.ctx.app.APP_ROOT, 'config.json')
    ctx.on('ready', () => {
      logger.info('configManager initializing')
      this.init()
    })
  }
  init() {
    if (!existsSync(this.configFilePath)) {
      logger.warn('config file not found, creating new config file')
      writeFileSync(this.configFilePath, JSON.stringify({
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
      }))
    }
    logger.success('config init success')
  }
  getServerConfig() {
    let config: ConfigType = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
    return config.server
  }
  saveServerConfig(config: ServerConfig) {
    let oldConfig: ConfigType = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
    oldConfig.server = config
    writeFileSync(this.configFilePath, JSON.stringify(oldConfig))
  }
  getBaseConfig() {
    let config: ConfigType = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
    return config.base
  }
  saveBaseConfig(config: BaseConfig) {
    let oldConfig: ConfigType = JSON.parse(readFileSync(this.configFilePath, 'utf-8'))
    oldConfig.base = config
    writeFileSync(this.configFilePath, JSON.stringify(oldConfig))
  }
}

export { ConfigManager }
import Schema from 'schemastery'
import type {
  ServerConfig,
  BaseConfig,
  HotkeyConfig,
  LLMConfig,
} from 'aircraft-rs'

export const ServerConfigSchema: Schema<ServerConfig> = Schema.object({
  baseUrl: Schema.string().description('登录域名').default('https://'),
  username: Schema.string().description('用户名').default(''),
  password: Schema.string().description('密码').role('secret').default(''),
  port: Schema.number().description('端口').default(25455),
  debug: Schema.boolean().description('调试模式').default(true),
  logEnabled: Schema.boolean().description('日志记录').default(true),
}).description('服务设置')

export const BaseConfigSchema: Schema<BaseConfig> = Schema.object({
  autoStart: Schema.boolean().description('开机自启').default(false),
  silentStart: Schema.boolean().description('静默启动').default(false),
  nothing: Schema.string()
    .description('这里什么也没有')
    .default('')
    .hidden(true),
}).description('基础设置')

export const HotkeyConfigSchema: Schema<HotkeyConfig> = Schema.object({
  docEnable: Schema.boolean().description('开启doc写入').default(false),
  docKey: Schema.string().description('doc写入快捷键').default(''),
  uploadEnable: Schema.boolean()
    .description('开启上传资料快捷键')
    .default(false),
  uploadKey: Schema.string().description('上传资料快捷键').default(''),
  copyEnable: Schema.boolean().description('开启复制快捷键').default(false),
  copyKey: Schema.string().description('复制快捷键').default(''),
  docxEnable: Schema.boolean().description('开启docx替换快捷键').default(false),
  docxKey: Schema.string().description('docx替换快捷键').default(''),
  inspector: Schema.string().description('检验员').default(''),
  signatureWidth: Schema.number().description('签名宽度').default(5.58),
  signatureHeight: Schema.number().description('签名高度').default(1.73),
}).description('快捷键设置')

export const LlmConfigSchema: Schema<LLMConfig> = Schema.object({
  baseUrl: Schema.string()
    .description('平台接口域名')
    .default('https://api.moonshot.cn/v1'),
  apiKey: Schema.string().description('API key').role('secret').default(''),
  model: Schema.string().description('模型').default('moonshot-v1-128k'),
}).description('服务设置')

export interface Config {
  base: BaseConfig
  server: ServerConfig
  llm: LLMConfig
  hotkey: HotkeyConfig
}

export const ConfigSchema: Schema<Config> = Schema.object({
  base: BaseConfigSchema,
  server: ServerConfigSchema,
  llm: LlmConfigSchema,
  hotkey: HotkeyConfigSchema,
}).description('配置设置')

import Schema from 'schemastery'
import type {
  ServerConfig,
  BaseConfig,
  HotkeyConfig,
  LLMConfig,
  CustomHotkey,
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

const CustomHotkey: Schema<CustomHotkey> = Schema.object({
  hotkey: Schema.string().description('快捷键').default(''),
  cmd: Schema.string().description('命令').default(''),
})

export const HotkeyConfigSchema: Schema<HotkeyConfig> = Schema.object({
  uploadEnable: Schema.boolean()
    .description('开启上传资料快捷键')
    .default(false),
  uploadKey: Schema.string().description('上传资料快捷键').default(''),
  copyEnable: Schema.boolean().description('开启复制快捷键').default(false),
  copyKey: Schema.string().description('复制快捷键').default(''),
  customHotkey: Schema.array(CustomHotkey).default([]).description('自定义快捷键')
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
})

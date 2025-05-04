import { ServerConfig, LlmConfig } from 'aircraft-rs'

export interface BaseConfig {
  auto_start: boolean
  silent_start: boolean
  nothing: string
}

export interface LogMessage {
  time_stamp: string
  level: string
  message: string
}

export interface Config {
  base: BaseConfig
  server: ServerConfig
  llm: LlmConfig
}

export { ServerConfig, LlmConfig }

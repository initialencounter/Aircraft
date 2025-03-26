export interface BaseConfig {
  auto_start: boolean;
  silent_start: boolean;
  nothing: string;
}

export interface ServerConfig {
  base_url: string;
  username: string;
  password: string;
  port: number;
  debug: boolean;
  log_enabled: boolean;
}

export interface LogMessage {
  time_stamp: string
  level: string
  message: string
}

export interface HotkeyConfig {
  doc_enable: boolean;
  doc_key: string;
  upload_enable: boolean;
  upload_key: string;
  copy_enable: boolean;
  copy_key: string;
  docx_enable: boolean;
  docx_key: string;
}

export interface Config {
  base: BaseConfig
  server: ServerConfig
  llm: LLMConfig
}


export interface LLMConfig {
  base_url: string;
  api_key: string;
  model: string;
}
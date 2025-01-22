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

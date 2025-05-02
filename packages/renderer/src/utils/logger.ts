import { isTauri, invoke } from '@tauri-apps/api/core'
const is_electron = !isTauri()

class Logger {
  constructor() {}
  info(...args: any[]) {
    if (is_electron) {
      console.log(...args)
    } else {
      invoke('write_log', { level: 'INFO', message: args.join(' ') })
    }
  }
  error(...args: any[]) {
    if (is_electron) {
      console.log(...args)
    } else {
      invoke('write_log', { level: 'ERROR', message: args.join(' ') })
    }
  }
}

export const logger = new Logger()

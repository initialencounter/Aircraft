import { Context, Service } from 'cordis'
import log from 'electron-log';

declare module 'cordis' {
  interface Context {
    log: Logger
  }
}

class Logger extends Service {
  constructor(ctx: Context) {
    super(ctx, 'log')
  }
  info(message: string) {
    log.info(message)
  }
  error(message: string) {
    log.error(message)
  }
  warn(message: string) {
    log.warn(message)
  }
  debug(message: string) {
    log.debug(message)
  }
}

export { Logger }

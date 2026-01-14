import type { Context } from 'cordis'
import { Service } from 'cordis'
import type {} from './app'
import type { LogMessage } from 'aircraft-rs'

export const name = 'logger'

declare module 'cordis' {
  interface Context {
    loggerService: LoggerService
  }
}

class LoggerService extends Service {
  static inject = ['app', 'core']
  constructor(ctx: Context) {
    super(ctx, 'loggerService')
    const logCache: LogMessage[] = []
    ctx.on('write-log', async (level: string, message: string) => {
      const timeStamp = new Date().toLocaleString()
      const log: LogMessage = {
        timeStamp,
        level,
        message,
      }
      if (!this.ctx.core.core) {
        logCache.push(log)
        return
      }
      if (logCache.length > 0) {
        for (const log of logCache) {
          this.ctx.core.core.writeLog(log)
        }
        logCache.length = 0
      }
      this.ctx.core.core.writeLog(log)
    })
  }

  tryGetLogs() {
    const logs = this.ctx.core.core.tryGetLogs()
    return logs
  }
}

export { LoggerService }

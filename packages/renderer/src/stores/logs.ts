import { defineStore } from 'pinia'

import { ipcManager } from '../utils/ipcManager'

interface LogState {
  logHistory: LogMessage[]
  logTimer: number | null
}

interface LogMessage {
  time_stamp: string
  level: string
  message: string
}

export const useLogStore = defineStore('logs', {
  state: (): LogState => ({
    logHistory: [],
    logTimer: null,
  }),
  actions: {
    async getServerLogs(): Promise<LogMessage[]> {
      return await ipcManager.invoke('get_server_logs')
    },
    startGetLog(): void {
      if (this.logTimer) return
      this.logTimer = window.setInterval(async () => {
        const logs = await this.getServerLogs()
        if (logs.length) {
          this.logHistory.push(...logs)
        }
      }, 500)
    },
    stopGetLog(): void {
      if (this.logTimer) {
        window.clearInterval(this.logTimer)
        this.logTimer = null
      }
    },
  },
})

export type LogStore = ReturnType<typeof useLogStore>

import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

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
      const logs = await invoke<LogMessage[]>('get_server_logs')
      return logs
    },
    startGetLog(callback: (logs: LogMessage[]) => void): void {
      if (this.logTimer) return
      this.logTimer = window.setInterval(async () => {
        let logs = await this.getServerLogs()
        this.logHistory.push(...logs)
        callback(logs)
      }, 1000)
    },
    stopGetLog(): void {
      if (this.logTimer) {
        window.clearInterval(this.logTimer)
        this.logTimer = null
      }
    },
  }
})

export type LogStore = ReturnType<typeof useLogStore> 
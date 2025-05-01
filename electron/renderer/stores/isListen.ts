import { defineStore } from 'pinia'
import { isTauri } from '@tauri-apps/api/core'
import { ipcManager } from '../utils/ipcManager';

interface AuthState {
  isListening: boolean
  timer: number | null
}

export const useListenStore = defineStore('isListen', {
  state: (): AuthState => ({
    isListening: false,
    timer: null,
  }),
  actions: {
    async checkListenStatus(): Promise<void> {
      if (!isTauri()) {
        this.isListening = true
        return
      }
      const isRunning = await ipcManager.invoke('is_listening')
      this.isListening = isRunning
    },
    startPolling(): void {
      if (this.timer) return // 避免重复启动

      this.timer = window.setInterval(() => {
        this.checkListenStatus()
      }, 1000)
    },
    stopPolling(): void {
      if (this.timer) {
        window.clearInterval(this.timer)
        this.timer = null
      }
    },
  }
})

// 导出 store 类型，以便在组件中使用
export type ListenStore = ReturnType<typeof useListenStore> 
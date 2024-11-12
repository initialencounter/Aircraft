import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@tauri-apps/api/core'

interface AuthState {
  isListening: boolean
  timer: number | null
}

export const useListenStore = defineStore('auth', {
  state: (): AuthState => ({
    isListening: false,
    timer: null,
  }),
  actions: {
    async checkLoginStatus(): Promise<void> {
      if (!isTauri()) {
        this.isListening = true
        return
      }
      const isLoggedIn = await invoke<boolean>('is_listening')
      this.isListening = isLoggedIn
    },
    startPolling(): void {
      if (this.timer) return // 避免重复启动

      this.timer = window.setInterval(() => {
        this.checkLoginStatus()
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
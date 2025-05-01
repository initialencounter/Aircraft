import { defineStore } from 'pinia'
import { isTauri } from '@tauri-apps/api/core'

import { ipcManager } from '../utils/ipcManager'

interface AuthState {
  loginStatus: boolean
  timer: number | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    loginStatus: false,
    timer: null,
  }),
  actions: {
    async checkLoginStatus(): Promise<void> {
      if (!isTauri()) {
        this.loginStatus = true
        return
      }
      const isLoggedIn = await ipcManager.invoke('get_login_status')
      this.loginStatus = isLoggedIn
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
  },
})

// 导出 store 类型，以便在组件中使用
export type AuthStore = ReturnType<typeof useAuthStore>

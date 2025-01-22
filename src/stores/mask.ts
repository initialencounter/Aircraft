import { defineStore } from 'pinia'
import { ipcManager } from "../utils/ipcManager";
interface MaskState {
  isUnlocked: boolean;
  secretCode: string;
}

export interface BaseConfig {
  auto_start: boolean;
  silent_start: boolean;
  nothing: string;
}

export const useMaskStore = defineStore('mask', {
  state: (): MaskState => ({
    isUnlocked: false,
    secretCode: '' // 设置你的暗号
  }),

  actions: {
    async unlock(code: string) {
      if (code){
        if (code !== this.secretCode){
          this.isUnlocked = false
          return false
        }
      }
      if (this.isUnlocked) {
        return true
      }
      let baseConfig = await ipcManager.invoke("get_base_config");
      if (baseConfig.nothing === this.secretCode) {
        this.isUnlocked = true
        return true
      }
      return false
    },
  },
})

export type MaskStore = ReturnType<typeof useMaskStore> 
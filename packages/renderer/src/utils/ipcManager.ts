import { isTauri } from '@tauri-apps/api/core'
const is_electron = !isTauri()

declare global {
  interface Window {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>
      on(
        channel: string,
        listener: (event: Event<any>, ...args: any[]) => void
      ): void
    }
  }
}

import { invoke } from '@tauri-apps/api/core'
import type { Event } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'

class IpcManager {
  constructor() {
    if (is_electron) {
      window.ipcRenderer?.on('logger:push', (_event, ...args) => {
        console.log('logger:push', ...args)
      })
    }
  }
  async invoke(channel: string, ...args: any[]): Promise<any> {
    if (is_electron) {
      return window.ipcRenderer?.invoke(channel, ...args)
    } else {
      return await invoke(channel, ...args)
    }
  }
  on(
    channel: string,
    listener: (event: Event<any>, ...args: any[]) => void
  ): void {
    if (is_electron) {
      window.ipcRenderer?.on(channel, listener)
    } else {
      listen(channel, listener)
    }
  }
}

export const ipcManager = new IpcManager()

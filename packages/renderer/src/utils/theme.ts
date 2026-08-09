import { ref } from 'vue'

export type ThemeName = 'light' | 'dark'

const STORAGE_KEY = 'aircraft-theme'

/** 当前主题，组件中可直接使用 */
export const theme = ref<ThemeName>('dark')

/** 应用启动时调用：读取已保存的主题并挂到 <html data-theme="..."> */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY)
  theme.value = saved === 'light' || saved === 'dark' ? saved : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
}

/** 切换深色 / 浅色主题，并持久化 */
export function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem(STORAGE_KEY, theme.value)
}

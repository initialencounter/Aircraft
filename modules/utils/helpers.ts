import { getQmsg } from '@/share/qmsg'

/**
 * 创建一个延时函数，用于异步操作的等待
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 获取当前的系统ID (pek或sek)
 */
export function getSystemId(): 'pek' | 'sek' {
  return window.location.pathname.startsWith('/pek') ? 'pek' : 'sek'
}

/**
 * 获取当前的主机地址
 */
export function getHost(): string {
  return window.location.host
}

/**
 * 获取当前项目编号
 */
export function getCurrentProjectNo(): string | null {
  const projectNoElement = document.getElementById('projectNo') as HTMLInputElement
  if (!projectNoElement) return null
  const projectNo = projectNoElement.innerHTML
  if (!projectNo) return null
  return projectNo
}

/**
 * 获取当前项目ID
 */
export function getCurrentProjectId(): string | null {
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  return urlParams.get('projectId')
}

/**
 * 阻止默认事件
 */
export function preventDefault(event: DragEvent): void {
  event.stopPropagation()
  event.preventDefault()
}

/**
 * 获取通知消息实例
 */
export function getNotification() {
  return getQmsg()
}

/**
 * 判断是否为检验页面
 */
export function isInspectPage(): boolean {
  return new URLSearchParams(window.location.search).get('from') === null
}

import { getHost } from './helpers'
import type { PekData, SekData } from '../../Validators/shared/types/index'
import type { AttachmentInfo } from '../../Validators/shared/types/attachment'
import type { EntrustModelDocx } from '../../Validators/shared/types/entrust'
import { LocalConfig } from '@/share/utils'

/**
 * 获取项目数据
 */
export async function getData(projectId: string, systemId: 'pek' | 'sek'): Promise<SekData | PekData | null> {
  const host = getHost()
  const response = await fetch(
    `https://${host}/rest/${systemId}/inspect/battery/${projectId}`,
    {
      method: 'GET',
      credentials: 'include'
    }
  )
  if (!response.ok) return null
  return await response.json()
}

/**
 * 获取附件文件
 */
export async function getAttachmentFiles(
  type: 'goodsfile' | 'batteryfile',
  projectId: string
): Promise<string> {
  const host = getHost()
  const response = await fetch(
    `https://${host}/document/project/${type}/${projectId}`,
    {
      method: 'GET',
      credentials: 'include'
    }
  )
  if (!response.ok) {
    return ''
  }
  return await response.text()
}

/**
 * 获取委托数据
 */
export async function getEntrustData(): Promise<string | null> {
  const entrustId = new URLSearchParams(window.location.search).get('entrustId')
  if (!entrustId) return null
  const response = await fetch(
    `${window.location.origin}/document/basicinfo/${entrustId}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/html',
        'Referer': window.location.href,
      }
    }
  )
  if (!response.ok) return null
  return await response.text()
}

/**
 * 获取项目附件信息
 */
export async function getProjectAttachmentInfo(
  projectNo: string, 
  is_965: boolean,
  localConfig: typeof LocalConfig
): Promise<AttachmentInfo | null> {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAttachmentInfo',
      aircraftServer: localConfig.aircraftServer,
      projectNo: projectNo,
      label: localConfig.enableLabelCheck ? '1' : '0',
      is_965,
    })
    return response
  } catch (error) {
    console.error('获取项目信息失败:', error)
    return null
  }
}

/**
 * 解析委托数据
 */
export function parseEntrust(entrustData: string | null): EntrustModelDocx {
  let res: EntrustModelDocx = {
    consignor: '',
    manufacturer: '',
  }
  if (!entrustData) return res
  const parser = new DOMParser()
  const doc = parser.parseFromString(entrustData, 'text/html')
  if (!doc) return res
  const consignor = doc.querySelector('body > div.main-content > div:nth-child(3) > div:nth-child(2) > div > div > div')
  const manufacturer = doc.querySelector('body > div.main-content > div:nth-child(7) > div:nth-child(1) > div > div > div')
  if (!consignor || !manufacturer) return res
  return {
    consignor: consignor.innerHTML.trim(),
    manufacturer: manufacturer.innerHTML.trim(),
  }
}

import type {
  AttachmentInfo,
  EntrustData,
  PekData,
  SekData,
} from '@aircraft/validators'
import type { LocalConfig } from '../../../share/utils'
import { getProjectDate } from '../../../share/utils'
import { getHost } from './helpers'
import { BatteryTestSummary, ProjectTraceResponse } from '../../../share/types'

/**
 * 获取项目数据
 */
export async function getData(
  projectId: string,
  systemId: 'pek' | 'sek'
): Promise<SekData | PekData | null> {
  const host = getHost()
  const response = await fetch(
    `https://${host}/rest/${systemId}/inspect/battery/${projectId}`,
    {
      method: 'GET',
      credentials: 'include',
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
      credentials: 'include',
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
        Accept: 'text/html',
        Referer: window.location.href,
      },
    }
  )
  if (!response.ok) return null
  return await response.text()
}

/**
 * 获取项目附件信息
 */
export async function getLocalAttachmentInfo(
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
    // 检查是否是扩展上下文失效错误
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      console.error('扩展上下文已失效，请刷新页面后重试')
      throw new Error('扩展已更新或重新加载，请刷新页面后重试')
    }
    console.error('获取项目信息失败:', error)
    return null
  }
}

/**
 * 解析委托数据
 */
export function parseEntrust(entrustData: string | null): EntrustData {
  const res: EntrustData = {
    consignor: '',
    manufacturer: '',
  }
  if (!entrustData) return res
  const parser = new DOMParser()
  const doc = parser.parseFromString(entrustData, 'text/html')
  if (!doc) return res
  const consignor = doc.querySelector(
    'body > div.main-content > div:nth-child(3) > div:nth-child(2) > div > div > div'
  )
  const manufacturer = doc.querySelector(
    'body > div.main-content > div:nth-child(7) > div:nth-child(1) > div > div > div'
  )
  if (!consignor || !manufacturer) return res
  return {
    consignor: consignor.innerHTML.trim(),
    manufacturer: manufacturer.innerHTML.trim(),
  }
}



export async function getProjectTrace(projectNo: string): Promise<ProjectTraceResponse | null> {
  if (!projectNo) return null;
  const [startDate, endDate] = getProjectDate(projectNo);
  const systemId = projectNo.slice(0, 3).toLowerCase();
  const queryParams = new URLSearchParams({
    systemId: systemId,
    category: '',
    reportType: '0',
    appraiserName: '',
    itemName: '',
    principal: '',
    startDate: startDate,
    endDate: endDate,
    projectNo: projectNo,
    page: '1',
    rows: '10',
  })
  const url = `${window.location.origin}/rest/project?${queryParams.toString()}`
  try {
    const response = await fetch(
      url,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          Referer: `${window.location.origin}/project/main`,
        },
      }
    )
    if (!response.ok) return null
    return await response.json()
  } catch (e) {
    console.error(e);
    return null
  }
}

export async function warmUp(projectNo: string) {
  await chrome.runtime.sendMessage({
    action: 'warmUp',
    projectNo,
  })
}

/**
 * 获取电池试验概要
 */
export async function getBatteryTestSummary(): Promise<BatteryTestSummary[]> {
  const projectId = new URLSearchParams(window.location.search).get('projectId')
  if (!projectId) return []
  const response = await fetch(
    `${window.location.origin}/rest/inspect/batterytest/project?projectId=${projectId}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: `${window.location.origin}/inspect/batterytest/project/main?`,
      },
    }
  )
  if (!response.ok) return []
  return await response.json()
}

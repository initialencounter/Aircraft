import { getAttachmentFiles, getEntrustData, parseEntrust, getProjectAttachmentInfo } from '../utils/api'
import { getCurrentProjectNo } from '../utils/helpers'
import type { PekData, SekData } from '../../Validators/shared/types/index'
import type { AttachmentInfo } from '../../Validators/shared/types/attachment'
import type { EntrustModelDocx } from '../../Validators/shared/types/entrust'
import { LocalConfig } from '@/share/utils'

/**
 * 检查附件文件
 */
export async function checkAttachmentFile(
  type: 'goodsfile' | 'batteryfile',
  projectNo: string,
  projectId: string
): Promise<Array<{ ok: boolean; result: string }>> {
  const AttachmentFilesName = type === 'goodsfile' ? '图片' : '概要'
  const AttachmentFilesText = await getAttachmentFiles(type, projectId)
  if (!AttachmentFilesText)
    return [{ ok: false, result: AttachmentFilesName + '未上传' }]
  const rawFileName = AttachmentFilesText.match(/"filename":"(.*?)\.pdf"/g)
  if (!rawFileName?.length)
    return [{ ok: false, result: AttachmentFilesName + '未上传' }]
  const fileName = rawFileName[0].slice(12, 29)
  if (fileName !== projectNo)
    return [{ ok: false, result: AttachmentFilesName + '上传错误' }]
  return []
}

/**
 * 检查所有附件文件
 */
export async function checkAttachmentFiles(
  projectNo: string, 
  projectId: string
): Promise<Array<{ ok: boolean; result: string }>> {
  const check1 = await checkAttachmentFile('goodsfile', projectNo, projectId)
  const check2 = await checkAttachmentFile('batteryfile', projectNo, projectId)
  return [...check1, ...check2]
}

/**
 * 检查附件内容
 */
export async function checkAttachment(
  systemId: 'pek' | 'sek',
  dataFromForm: PekData | SekData,
  localConfig: typeof LocalConfig
): Promise<Array<{ ok: boolean; result: string }>> {
  if (localConfig.enableCheckAttachment === false) return []
  try {
    const projectNo = getCurrentProjectNo()
    if (!projectNo) return []
    let is_965 = false
    if (systemId === 'pek') {
      is_965 = (dataFromForm as PekData).inspectionItem1 == 0
    } else {
      is_965 = (dataFromForm as SekData).otherDescribe === '540'
    }
    
    const attachmentInfo: AttachmentInfo | null = await getProjectAttachmentInfo(projectNo, is_965, localConfig)
    console.log(attachmentInfo, 'attachmentInfo')
    if (!attachmentInfo) return [{ ok: false, result: '无法获取本地的图片概要' }]
    
    if (!localConfig.enableLabelCheck) {
      attachmentInfo.goods.labels = ['pass']
    }
    
    
    const entrustDataText = await getEntrustData()
    const entrustData = parseEntrust(entrustDataText)
    
    return checkSummary(systemId, dataFromForm, attachmentInfo, entrustData)
  } catch (e) {
    console.log(e)
    return [{ ok: false, result: '附件解析失败' }]
  }
}

/**
 * 检查摘要
 */
export function checkSummary(
  systemId: 'pek' | 'sek',
  dataFromForm: PekData | SekData,
  attachmentInfo: AttachmentInfo, 
  entrustData: EntrustModelDocx
): Array<{ ok: boolean; result: string }> {
  if (systemId === 'pek') {
    return window.checkPekAttachment(dataFromForm as PekData, attachmentInfo, entrustData)
  } else {
    return window.checkSekAttachment(dataFromForm as SekData, attachmentInfo, entrustData)
  }
}

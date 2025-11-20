import type {
  AttachmentInfo,
  EntrustData,
  PekData,
  SekData,
} from '@aircraft/validators'
import { getCurrentProjectNo } from '../utils/helpers'
import {
  getAttachmentFiles,
  getProjectAttachmentInfo,
} from '../utils/api'
import type { LocalConfig } from '../../../share/utils'
import { PekSodiumData, SekSodiumData } from '../../../../validators/src/sodium/shared/types';

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
  dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData,
  localConfig: typeof LocalConfig,
  entrustData: EntrustData,
  isSodium: boolean,
): Promise<Array<{ ok: boolean; result: string }>> {
  if (localConfig.enableCheckAttachment === false) return []
  try {
    const projectNo = getCurrentProjectNo()
    if (!projectNo) return []
    let is_965 = false
    if (systemId === 'pek') {
      is_965 = (dataFromForm as PekData).inspectionItem1 === 0
    } else {
      is_965 = (dataFromForm as SekData).otherDescribe === '540'
    }

    const attachmentInfo: AttachmentInfo | null =
      await getProjectAttachmentInfo(projectNo, is_965, localConfig)
    console.log(attachmentInfo, 'attachmentInfo')
    if (!attachmentInfo)
      return [{ ok: false, result: '无法获取本地的图片概要' }]

    if (!localConfig.enableLabelCheck) {
      attachmentInfo.goods.labels = ['pass']
    }

    return checkSummary(systemId, dataFromForm, attachmentInfo, entrustData, localConfig, isSodium)
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
  dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData,
  localConfig: typeof LocalConfig,
  isSodium = false
): Array<{ ok: boolean; result: string }> {
  if (isSodium) {
    if (systemId === 'pek') {
      return window.checkPekSodiumAttachment(
        dataFromForm as PekSodiumData,
        attachmentInfo,
        entrustData
      )
    } else {
      return window.checkSekSodiumAttachment(
        dataFromForm as SekSodiumData,
        attachmentInfo,
        entrustData
      )
    }
  } else {
    if (systemId === 'pek') {
      let results: Array<{ ok: boolean; result: string }> = []
      if (localConfig.autoCheckStackEvaluation === true) {
        if (dataFromForm.otherDescribe.includes(
          '2c9180849267773c0192dc73c77e5fb2'
        )) {
          if (!attachmentInfo?.other) {
            results.push({ ok: false, result: '找不到项目文件夹' })
          }
          if (attachmentInfo?.other?.stackEvaluation === false) {
            results.push({ ok: false, result: `项目文件夹内找不到堆码评估单` })
          }
        }
        results.push(...window.checkPekAttachment(
          dataFromForm as PekData,
          attachmentInfo,
          entrustData
        ))
      }

      if (localConfig.manualCheckStackEvaluation === true) {
        const stackTest = String(dataFromForm['inspectionItem6']) === '1' // 堆码
        const stackTestEvaluation = dataFromForm.otherDescribe.includes(
          '2c9180849267773c0192dc73c77e5fb2'
        )
        if (stackTestEvaluation || stackTest) {
          results.push({ ok: true, result: `你已勾选${stackTest ? '堆码报告' : '评估单'}, 请确认` })
        }
      }
      results.push(...window.checkPekAttachment(
        dataFromForm as PekData,
        attachmentInfo,
        entrustData
      ))
      return results
    } else {
      return window.checkSekAttachment(
        dataFromForm as SekData,
        attachmentInfo,
        entrustData
      )
    }
  }

}

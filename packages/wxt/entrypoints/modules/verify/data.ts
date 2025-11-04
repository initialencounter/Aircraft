import type { EntrustData, PekData, SekData } from '@aircraft/validators'
import { getFormData } from '../utils/form'
import { getData, getProjectTrace } from '../utils/api'
import { getHost } from '../utils/helpers'
import { getProjectYear, type LocalConfig } from '../../../share/utils'
import { checkAttachment, checkAttachmentFiles } from './attachment'
import { checkLabelManual } from './label'
import { getEntrustData, parseEntrust } from '../utils/api'
import { checkModelWithFactory, checkModel } from './dangetousModel'
import { PekSodiumData, SekSodiumData } from '../../../../validators/src/sodium/shared/types'

/**
 * 验证表单数据
 */
export async function verifyFormData(
  category: string,
  systemId: 'pek' | 'sek',
  projectId: string,
  projectNo: string,
  localConfig: typeof LocalConfig
): Promise<Array<{ ok: boolean; result: string }>> {
  let result = []
  let dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData
  let model: string
  if (category === 'battery') {
    const data = await getProjectTrace(projectNo);
    let projectYear: string | undefined = undefined;
    if (data && data.rows.length > 0) {
      projectYear = getProjectYear(projectNo, data.rows[0].nextYear)
    }
    if (systemId === 'pek') {

      dataFromForm = getFormData<PekData>(systemId)
      model = dataFromForm.model
      console.log('Project Year:', projectYear);
      result = window.checkPekBtyType(dataFromForm, projectYear)
    } else {
      dataFromForm = getFormData<SekData>(systemId)
      model = dataFromForm.btyKind
      result = window.checkSekBtyType(dataFromForm, projectYear)
    }
  } else {
    if (systemId === 'pek') {
      dataFromForm = getFormData<PekSodiumData>(systemId)
      model = dataFromForm.model
      result = window.checkPekSodiumBtyType(dataFromForm)
    } else {
      dataFromForm = getFormData<SekSodiumData>(systemId)
      model = dataFromForm.btyKind
      result = window.checkSekSodiumBtyType(dataFromForm)
    }
  }

  result.push(...(await checkAttachmentFiles(projectNo, projectId)))

  let entrustData: null | EntrustData = null
  try {
    const entrustDataText = await getEntrustData()
    entrustData = parseEntrust(entrustDataText)
  } catch {
    result.push({ ok: false, result: '获取系统委托方和制造商失败' })
  }

  if (entrustData) {
    result.push(
      ...checkModelWithFactory(
        entrustData,
        localConfig.dangerousModelsWithFactory,
        model
      )
    )
    result.push(
      ...(await checkAttachment(
        systemId,
        dataFromForm,
        localConfig,
        entrustData,
        category === 'sodium',
      ))
    )
  }

  result.push(...checkModel(localConfig.dangerousModels, model))

  if (localConfig.enableLabelCheckManual) {
    result.push(...checkLabelManual(systemId, dataFromForm))
  }

  return result
}

/**
 * 测试验证多个项目
 */
export async function testVerifyMultiple(
  systemId: 'pek' | 'sek'
): Promise<void> {
  const host = getHost()
  const response = await fetch(
    `https://${host}/rest/inspect/query?category=battery&projectNo=${systemId.toUpperCase()}GZ&startDate=2024-09-03&endDate=2024-09-03&page=1&rows=100`,
    {
      method: 'GET',
      credentials: 'include',
    }
  )

  if (!response.ok) {
    console.log('请求失败1')
    return
  }

  const { rows }: { total: number; rows: PekData[] } = await response.json()

  for (let i = 0; i < 100; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    // if (rows[i]['editStatus'] !== 3) continue
    try {
      const projectId = rows[i]['projectId']
      console.log(rows[i]['projectNo'])
      const currentData = await getData(projectId, systemId)

      if (currentData === null) {
        console.log(projectId)
        console.log('请求失败2')
        continue
      }

      let result = []
      if (systemId === 'pek') {
        result = window.checkPekBtyType(currentData as PekData)
      } else {
        result = window.checkSekBtyType(currentData as SekData)
      }

      if (result.length) {
        if (result.length === 1 && result[0].result.includes('请忽略')) {
          // 忽略的错误
        } else {
          console.log(result)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
}

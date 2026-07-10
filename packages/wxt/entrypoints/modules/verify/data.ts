import { checkInspectData, checkModel, checkModelWithFactory, CheckResult, checkStackEvaluation, type PekData, type SekData } from '@aircraft/validators'
import { getFormData } from '../utils/form'
import { getBatteryTestSummary, getLocalAttachmentInfo } from '../utils/api'
import { type LocalConfig } from '../../../share/utils'
import { checkLocalAttachment, checkSystemAttachmentFile, drawSegmentMask, showSegmentMask } from './attachment'
import { getEntrustData, parseEntrust } from '../utils/api'
import { PekSodiumData, SekSodiumData } from '../../../../validators/src/sodium/shared/types'
import { batteryTestSummaryToSummaryInfo } from '../utils/helpers'
import { ID_EN_SHAPE_MAP } from '../../../share/shapeMap'
import { ID_EN_COLOR_MAP } from '../../../share/colorMap'

/**
 * 验证表单数据
 */
export async function verifyFormData(
  category: string,
  systemId: 'pek' | 'sek',
  projectId: string,
  projectNo: string,
  localConfig: typeof LocalConfig
): Promise<CheckResult[]> {
  let result: CheckResult[] = []
  let dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData
    = getFormData(systemId)

  const model = (dataFromForm as PekData).model ?? (dataFromForm as SekData).btyKind
  // const data = await getProjectTrace(projectNo);
  let projectYear: string | undefined = undefined;
  // if (data && data.rows.length > 0 && data.rows[0]) {
  //   projectYear = getProjectYear(projectNo, data.rows[0].nextYear)
  // }

  // 计算 is_965 值，后续并行请求需要用到
  let is_965 = false
  if (systemId === 'pek') {
    is_965 = (dataFromForm as PekData).inspectionItem1 === 0
  } else {
    is_965 = (dataFromForm as SekData).otherDescribe === '540'
  }

  // 并行执行三个异步操作以减少等待时间
  let [goodsfileCheckResults, batteryfileCheckResults, entrustData, attachmentInfo, batteryTestSummary] = await Promise.all([
    // 检测系统的是否上传的资料
    checkSystemAttachmentFile('goodsfile', projectNo, projectId),
    checkSystemAttachmentFile('batteryfile', projectNo, projectId),
    // 获取系统委托方和制造商
    getEntrustData()
      .then(text => (parseEntrust(text)))
      .catch(() => (null)),
    // 检查本地附件信息
    getLocalAttachmentInfo(projectNo, is_965, localConfig),
    getBatteryTestSummary()
  ])

  if (batteryTestSummary.length > 0) {
    batteryfileCheckResults = []
    if (attachmentInfo) {
      attachmentInfo.summary = batteryTestSummaryToSummaryInfo(batteryTestSummary[0])
      const shapeId = (batteryTestSummary[0].shape) as keyof typeof ID_EN_SHAPE_MAP
      const colorId = (batteryTestSummary[0].color) as keyof typeof ID_EN_COLOR_MAP
      const enAppearance = ID_EN_SHAPE_MAP[shapeId] + ID_EN_COLOR_MAP[colorId]
      if (enAppearance.length > 30) {
        console.log("英文长度超过限制:", { shapeId, colorId, enAppearance, length: enAppearance.length })
        result.push(
          {
            ok: false,
            result: "系统概要外观打印预览可能显示不全"
          }
        )
      }
    }
    const otherDescribeCAddition = (dataFromForm as PekData).otherDescribeCAddition ?? (dataFromForm as SekData).otherDescribeCAddition
    const isChargingCase = otherDescribeCAddition.includes('耳机') && otherDescribeCAddition.includes('总净重') && (otherDescribeCAddition.includes('充电盒') || otherDescribeCAddition.includes('充电仓'))
    if (batteryTestSummary.length > 1 && !isChargingCase) {
      result.push(
        {
          ok: false,
          result: "检测到多条电池测试概要，请检查是否有重复创建概要"
        }
      )
    }
  }

  console.log('验证元数据:', { localConfig, dataFromForm, model, projectYear, systemId, category, is_965, entrustData, attachmentInfo })

  // 系统资料上传检查
  result.push(...goodsfileCheckResults)
  result.push(...batteryfileCheckResults)

  // 检查黑名单电池
  result.push(...checkModel(localConfig.dangerousModels, model))
  result.push(
    ...checkModelWithFactory(
      entrustData,
      localConfig.dangerousModelsWithFactory,
      model
    )
  )

  // 检查本地图片概要
  result.push(
    ...(await checkLocalAttachment(
      systemId,
      dataFromForm,
      localConfig,
      entrustData,
      attachmentInfo,
      category === 'sodium',
    ))
  )

  if (attachmentInfo?.goods?.segmentResults && localConfig.enableLabelCheck) {
    const img = await drawSegmentMask(attachmentInfo)
    if (img) {
      showSegmentMask(img)
    }
  }

  // 检查检验单信息
  result.push(...checkInspectData(dataFromForm, category, projectYear))

  // 检查堆码评估
  result.push(...checkStackEvaluation(
    localConfig.autoCheckStackEvaluation,
    localConfig.manualCheckStackEvaluation,
    dataFromForm as PekData,
    attachmentInfo?.other,
    systemId,
    category,
  ))

  return result
}

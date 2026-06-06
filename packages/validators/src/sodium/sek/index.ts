import { CheckResult, PekUNNO } from "../../lithium/shared/types"
import { SekSodiumBtyType, SekSodiumData } from "../shared/types"
import { getIsCell, matchBatteryWeight, matchCapacity, matchNumber, matchVoltage, matchWattHour } from "../../lithium/shared/utils"
import { checkComment } from "../../lithium/sek/checkComment"
import { checkReMark } from "../../lithium/sek/checkReMark"
import { wattHourScope } from "../../lithium/sek/wattHourScope"
import { baseCheck, BaseCheckSelectors } from "../../lithium/shared"
import { packetOrContain } from "../../lithium/sek/packetOrContain"
import { checkDropTest } from "../../lithium/sek/checkDropTest"
import { checkBtyLabel } from "../../lithium/sek/checkBtyLabel"
import { checkSodiumConclusions } from "./checkSodiumConclusions"

export function checkSekSodiumBtyType(currentData: SekSodiumData): CheckResult[] {
  const result: CheckResult[] = []
  const checkMap = {
    '600': ['≤100Wh', '>100Wh'],
    '601': ['≤20Wh', '>20Wh'],
    '602': ['≤20Wh', '>20Wh'],
  }
  const btyType = currentData['btyType'] as SekSodiumBtyType
  const {
    // 项目编号
    projectNo,
    // 中文品名
    itemCName,
    // 英文品名
    itemEName,
    // 电池尺寸
    btySize,
    // 电池形状
    btyShape,
    // 电池型号
    btyKind,
    // 其他描述
    otherDescribe,
    // 注意事项
    remarks,
    // 备注
    comment,
    // 特殊规定
    commentExtra,
    // 技术备注
    market,
    // 危险性
    classOrDiv,
  } = currentData
  const btyCount = matchNumber(currentData['btyCount'])
  // 电压
  const voltage = matchVoltage(itemCName)
  // 容量
  const capacity = matchCapacity(itemCName)
  // 瓦时
  const wattHour = matchNumber(currentData['inspectionItem1Text1'])
  const wattHourFromName = matchWattHour(itemCName)
  // 真实显示净重数字 单位：g
  const netWeightDisplay = matchNumber(currentData['btyNetWeight']) * 1000
  // 毛重
  const btyGrossWeight = Number(currentData['btyGrossWeight'])
  // 描述
  const otherDescribeCAddition = currentData['otherDescribeCAddition']
  // 电池重量
  const batteryWeight = matchBatteryWeight(
    currentData['otherDescribeCAddition']
  )
  // 瓦时数或钠含量范围
  const inspectionResult1 = currentData['inspectionResult1']
  // UN编号
  const unno = currentData['unno'] as PekUNNO
  // 电芯
  const isCell: boolean = getIsCell(btyType)
  // 包装类型 0 965 1 966 2 967
  const otherDescribe2Pek = otherDescribe.slice(2) as
    | '0'
    | '1'
    | '2'
  // 是否锂离子电池
  const isIon = true
  // 参见包装说明，可能为空，通常来自模板
  const unTest = String(currentData['inspectionResult2']) === '0' // UN38.3 测试
  const isBtyLabel = String(currentData['inspectionResult6']) === '0' // 电池标记
  const dropTest = String(currentData['inspectionResult5']) === '0' // 跌落
  // 包装等级
  const packageGrade = currentData['pg']
  // 结论
  const conclusions = Number(currentData['conclusions'])
  // 运输专用名称
  const properShippingName = currentData['psn']
  const otherDescribeChecked = currentData['otherDescribeChecked'] === '1'
  // 是否为充电盒或关联报告
  const isChargeBoxOrRelated = otherDescribeCAddition.includes('总净重')
  if (!itemCName) result.push({ ok: false, result: '中文品名为空', selector: '[name="itemCName"]' })
  if (!itemEName) result.push({ ok: false, result: '英文品名为空', selector: '[name="itemEName"]' })
  if (!btyKind) result.push({ ok: false, result: '电池型号为空', selector: '[name="btyKind"]' })
  if (!otherDescribe) result.push({ ok: false, result: '其他描述包装方式为空', selector: '[name="otherDescribe"]' })
  if (!otherDescribeChecked)
    result.push({ ok: false, result: '未勾选其他描述', selector: '[name="otherDescribeCAddition"]' })
  if (!unTest) result.push({ ok: false, result: '未勾选通过 UN38.3 测试', selector: '[name="inspectionResult2"]' })
  if (!market) result.push({ ok: false, result: '技术备注为空', selector: '[name="market"]' })
  if (otherDescribe.length > 3)
    result.push({ ok: false, result: '其他描述包装方式不唯一', selector: '[name="otherDescribe"]' })
  const activeState = false
  const isLithium = false
  // SEK 表单元素ID映射
  const selectors: BaseCheckSelectors = {
    btySize: '[name="btySize"]',
    btyShape: '[name="btyShapeValue"]',
    btyCount: '[name="btyCount"]',
    netWeight: '[name="btyNetWeight"]',
    btyType: '[name="btyType"]',
    itemCName: '[name="itemCName"]',
    itemEName: '[name="itemEName"]',
    btyKind: '[name="btyKind"]',
    voltage: '',
    wattHour: '[name="inspectionItem1Text1"]',
    otherDescribe: '[name="otherDescribeCAddition"]',
  }
  // 基础检查
  result.push(
    ...baseCheck(
      btySize,
      btyShape,
      batteryWeight,
      btyCount,
      netWeightDisplay,
      btyType,
      otherDescribeCAddition,
      isChargeBoxOrRelated,
      isCell,
      itemCName,
      itemEName,
      btyKind,
      voltage,
      capacity,
      wattHour,
      wattHourFromName,
      otherDescribe2Pek,
      activeState,
      isLithium,
      selectors,
    )
  )
  // 包装与其他描述验证
  result.push(
    ...packetOrContain(
      otherDescribe,
      otherDescribeCAddition,
      isChargeBoxOrRelated,
      '[name="otherDescribeCAddition"]',
    )
  )
  // 检验结果不符合检查
  for (let resultIndex = 2; resultIndex <= 9; resultIndex++) {
    const resultName = 'inspectionResult' + String(resultIndex)
    // @ts-ignore
    if (String(currentData[resultName]) === '1') {
      result.push({ ok: false, result: `${resultName}不符合`, selector: resultName })
    }
  }
  // 检验结果3
  const inspectionResult3 = currentData['inspectionResult3']
  if (inspectionResult3 !== '0')
    result.push({
      ok: false,
      result: '检验结果3错误，未勾选电池按照规定的质量管理体系进行制造。',
      selector: '[name="inspectionResult3"]',
    })

  // 检验结果4
  const inspectionResult4 = currentData['inspectionResult4']
  if (inspectionResult4 !== '0')
    result.push({
      ok: false,
      result:
        '检验结果4错误，未勾选该锂电池不属于召回电池，不属于废弃和回收电池。',
      selector: '[name="inspectionResult4"]',
    })

  // 检验结果5 1.2米跌落
  result.push(...checkDropTest(otherDescribe, dropTest, conclusions, '[name="inspectionResult5"]'))

  // 电池标记
  result.push(...checkBtyLabel(isBtyLabel, btyShape, conclusions, btyType, otherDescribe2Pek, '[name="inspectionResult6"]'))


  // 随附文件
  if (currentData['inspectionResult7'] !== '2')
    result.push({ ok: false, result: '随附文件错误，未勾选不适用', selector: '[name="inspectionResult7"]' })
  // 鉴别项目8，9
  if (
    currentData['inspectionResult8'] !== '2' ||
    currentData['inspectionResult9'] !== '2'
  )
    result.push({ ok: false, result: '鉴别项目8，9 错误，未勾选不适用', selector: '[name="inspectionResult8"]' })
  if (
    currentData['inspectionItem8Cn'] !== '' ||
    currentData['inspectionItem8En'] !== '' ||
    currentData['inspectionItem9Cn'] !== '' ||
    currentData['inspectionItem9En'] !== ''
  )
    result.push({ ok: false, result: '鉴别项目8，9 不为空', selector: '[name="inspectionItem8Cn"]' })
  // 注意事项
  result.push(...checkReMark(remarks, projectNo, otherDescribe, '[name="remarksValue"]'))
  // 备注
  result.push(
    ...checkComment(
      comment,
      commentExtra,
      projectNo,
      conclusions,
      otherDescribe,
      '[name="commentValue"]',
      '[name="commentExtra"]',
    )
  )
  // 结论
  result.push(
    ...checkSodiumConclusions(
      conclusions,
      unno,
      otherDescribe,
      inspectionResult1,
      btyGrossWeight,
      packageGrade,
      classOrDiv,
      properShippingName,
      '[name="psn"]',
      '[name="unno"]',
      '[name="classOrDiv"]',
      '[name="pg"]',
      '[name="btyGrossWeight"]',
      '[name="conclusions"]',
    )
  )
  if (isIon) {
    result.push(...checkSekSodiumIonBtyType(currentData, checkMap, btyType))
  }
  return result
}

function checkSekSodiumIonBtyType(
  currentData: SekSodiumData,
  checkMap: Record<string, string[]>,
  btyType: string
) {
  const result: CheckResult[] = []
  // 鉴别项目1
  if (currentData['inspectionItem1'] !== '2111')
    result.push({ ok: false, result: '鉴别项目1错误，未勾选瓦时数', selector: '[name="inspectionItem1"]' })
  if (currentData['inspectionItem1Text1'] === '')
    result.push({ ok: false, result: '鉴别项目1错误，瓦时数为空', selector: '[name="inspectionItem1Text1"]' })
  if (currentData['inspectionItem1Text2'] !== '')
    result.push({ ok: false, result: '鉴别项目1错误，钠含量不为空', selector: '[name="inspectionItem1Text2"]' })

  // 验证瓦数数
  const wattHourFromName = matchWattHour(currentData['itemCName'])
  const wattHour = matchNumber(currentData['inspectionItem1Text1'])
  const inspectionResult1 = currentData['inspectionResult1']
  if (!checkMap[btyType].includes(inspectionResult1))
    result.push({ ok: false, result: '检验结果1错误，瓦时数取值范围错误', selector: '[name="inspectionResult1"]' })
  if (wattHourFromName > 0 && !isNaN(wattHour)) {
    if (wattHour !== wattHourFromName)
      result.push({
        ok: false,
        result: `瓦时数与项目名称不匹配${wattHour} !== ${wattHourFromName}`,
        selector: '[name="inspectionItem1Text1"]',
      })
  }
  result.push(...wattHourScope(btyType, inspectionResult1, wattHour, '[name="inspectionResult1"]'))
  return result
}

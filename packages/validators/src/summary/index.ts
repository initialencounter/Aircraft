import type { AttachmentInfo } from 'aircraft-rs'
import type {
  CheckResult,
  PekData,
  PekPkgInfo,
  PekUNNO,
  PkgInfoSubType,
  SekBtyType,
  SekData,
  EntrustData,
} from '../lithium/shared/types'
import {
  getBtyTypeCode,
  getPkgInfoSubType,
  matchBatteryWeight,
  matchCapacity,
  matchNumber,
  matchTotalNetweight,
  matchVoltage,
} from '../lithium/shared/utils'
import { checkBatteryType } from './checkBatteryType'
import { checkCapacity } from './checkCapacity'
import { checkIssueDate } from './checkIssueDate'
import { checkLiContent } from './checkLiContent'
import { checkMass } from './checkMass'
import { checkModel } from './checkModel'
import { checkName } from './checkName'
import { checkShape } from './checkShape'
import { checkT7 } from './checkT7'
import { checkTradeMark } from './checkTradeMark'
import { checkVoltage } from './checkVoltage'
import { checkWattHour } from './checkWattHour'
import { checkProjectNo } from './checkProjectNo'
import { checkConsignor } from './checkConsignor'
import { checkManufacturer } from './checkManufacturer'
import { checkMarket } from './checkMarket'
import { checkUN38fg } from './checkUN38fg'
import { checkPekGoods, checkSekGoods } from './goods'
import { checkTitle } from './checkTitle'
import { checkColor } from './checkColor'
import { checkT8 } from './checkT8'
import { PekSodiumData, SekSodiumData } from '../sodium/shared/types'

export function checkSekAttachment(
  currentData: SekData | SekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData
) {
  const summaryData = attachmentInfo.summary
  const goodsInfo = attachmentInfo.goods
  const btyType = currentData['btyType'] as SekBtyType
  const {
    // 中文品名
    itemCName,
    // 英文品名
    itemEName,
    btyColor,
    // 电池形状
    // 锂离子电池 锂离子电芯 锂金属电池 锂金属电芯 单芯锂离子电池 单芯锂金属电池
    // '500'    | '501'    | '504'  |  '502'   | '503'       | '505'
    btyShape,
    // 电池型号
    btyKind,
    // 其他描述
    otherDescribe,
    // 技术备注
    market,
  } = currentData
  // 电压
  const voltage = matchVoltage(itemCName)
  // 容量
  const capacity = matchCapacity(itemCName)
  // 瓦时
  const wattHour = matchNumber(currentData['inspectionItem1Text1'])
  // 锂含量
  const liContent = matchNumber(currentData['inspectionItem1Text2'])
  // 电池重量
  const batteryWeight = matchBatteryWeight(
    currentData['otherDescribeCAddition']
  )
  // UN编号
  const unno = currentData['unno'] as PekUNNO
  // 包装类型 0 965 1 966 2 967
  const packageType = (
    otherDescribe === '540' ? '0' : otherDescribe === '541' ? '1' : '2'
  ) as '0' | '1' | '2'
  // 结论
  const conclusions = Number(currentData['conclusions'])
  const btyBrand = currentData['btyBrand']
  const results: CheckResult[] = []
  results.push(
    ...checkSekGoods(
      conclusions,
      unno,
      itemCName,
      currentData.projectNo,
      goodsInfo
    )
  )
  const summaryCheckParams: SummaryCheckParams = {
    itemCName,
    itemEName,
    btyKind,
    btyColor,
    btyShape,
    voltage,
    capacity,
    wattHour,
    liContent,
    batteryWeight,
    packageType,
    btyType,
    btyBrand,
    market,
  }
  results.push(
    ...checkSummaryFromLLM(
      currentData,
      summaryData,
      entrustData,
      summaryCheckParams
    )
  )
  return results
}
export function checkPekAttachment(
  currentData: PekData | PekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData,
  isSodium: boolean = false,
) {
  const summaryData = attachmentInfo.summary
  const goodsInfo = attachmentInfo.goods
  const btyType = getBtyTypeCode(currentData, isSodium)
  // 品名
  const {
    // 品名
    itemCName,
    // 品名
    itemEName,
    // 仅限货机
    packCargo,
    // 技术备注
    market,
  } = currentData
  // 型号
  const btyKind = currentData['model']
  // 电压
  const voltage = matchNumber(currentData['inspectionItem2Text1'])
  // 容量
  const capacity = matchNumber(currentData['inspectionItem2Text2'])
  // 瓦时
  const wattHour = matchNumber(currentData['inspectionItem3Text1'])
  // 锂含量
  const liContent = matchNumber(currentData['inspectionItem4Text1'])
  // 净重 单位：g
  const netWeight = parseFloat(currentData['netWeight'])
  // 描述
  const otherDescribeCAddition = currentData['otherDescribeCAddition']
  // 电池重量
  const batteryWeight = matchBatteryWeight(otherDescribeCAddition)
  // 电池颜色
  const btyColor = currentData['color']
  // 电池形状
  const btyShape = currentData['shape']
  // 包装类型 0 965 1 966 2 967
  const packageType = String(currentData['inspectionItem1']) as '0' | '1' | '2'
  // 参见包装说明，可能为空，通常来自模板
  const pkgInfoReference: PekPkgInfo = currentData['inspectionItem5Text1']
  // 结论的包装类型，通常来自模板
  // 第二个包装说明，可能为空, 可以区分I II IA IB，通常来自于模板
  const pkgInfoSubType: PkgInfoSubType = getPkgInfoSubType(
    pkgInfoReference,
    packCargo
  )
  const btyBrand = currentData['brands']
  const totalNetWeight = (!netWeight || isNaN(netWeight)) ? matchTotalNetweight(otherDescribeCAddition) : netWeight
  const results: CheckResult[] = []
  results.push(
    ...checkPekGoods(
      pkgInfoSubType,
      totalNetWeight,
      itemCName,
      currentData.projectNo,
      goodsInfo
    )
  )
  const summaryCheckParams: SummaryCheckParams = {
    itemCName,
    itemEName,
    btyKind,
    btyColor,
    btyShape,
    voltage,
    capacity,
    wattHour,
    liContent,
    batteryWeight,
    packageType,
    btyType,
    btyBrand,
    market,
  }
  results.push(
    ...checkSummaryFromLLM(
      currentData,
      summaryData,
      entrustData,
      summaryCheckParams
    )
  )
  return results
}

interface SummaryCheckParams {
  itemCName: string,
  itemEName: string,
  btyKind: string,
  btyColor: string,
  btyShape: string,
  voltage: number,
  capacity: number,
  wattHour: number,
  liContent: number,
  batteryWeight: number,
  packageType: '0' | '1' | '2',
  btyType: SekBtyType,
  btyBrand: string,
  market: string
}

function checkSummaryFromLLM(
  currentData: PekData | SekData | PekSodiumData | SekSodiumData,
  summaryData: AttachmentInfo["summary"],
  entrustData: EntrustData,
  summaryCheckParams: SummaryCheckParams,
  isSodium: boolean = false,
) {
  const results: CheckResult[] = []
  const {
    itemCName,
    itemEName,
    btyKind,
    btyColor,
    btyShape,
    voltage,
    capacity,
    wattHour,
    liContent,
    batteryWeight,
    packageType,
    btyType,
    btyBrand,
    market,
  } = summaryCheckParams
  results.push(...checkTitle(summaryData.title))
  results.push(
    ...checkName(packageType, itemEName, itemCName, btyKind, summaryData.cnName)
  )
  results.push(...checkBatteryType(btyType, summaryData.classification))
  results.push(...checkModel(btyKind, summaryData.model))
  results.push(...checkTradeMark(btyBrand, summaryData.trademark))
  if (voltage) {
    results.push(...checkVoltage(voltage, summaryData.voltage))
  }
  if (capacity) {
    results.push(...checkCapacity(capacity, summaryData.capacity))
  }
  results.push(...checkWattHour(wattHour, summaryData.watt))
  results.push(...checkShape(btyShape, summaryData.shape))
  results.push(...checkColor(btyColor, summaryData.shape))
  results.push(...checkMass(batteryWeight, summaryData.mass))
  results.push(...checkLiContent(liContent, summaryData.licontent))
  results.push(...checkT7(btyType, summaryData.test7, summaryData.note))
  results.push(...checkT8(isSodium, summaryData.test8))
  results.push(...checkIssueDate(summaryData.issueDate, currentData.projectNo))
  results.push(...checkProjectNo(currentData.projectNo, summaryData.projectNo))
  results.push(...checkConsignor(entrustData.consignor, summaryData.consignor))
  results.push(
    ...checkManufacturer(entrustData.manufacturer, summaryData.manufacturer)
  )
  results.push(...checkMarket(market, summaryData.testReportNo))
  results.push(...checkUN38fg(summaryData.un38F, summaryData.un38G))
  return results
}

export function checkSekSodiumAttachment(
  currentData: SekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData
) {
  return checkSekAttachment(currentData, attachmentInfo, entrustData)
}

export function checkPekSodiumAttachment(
  currentData: PekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData
) {
  return checkPekAttachment(currentData, attachmentInfo, entrustData, true)
}
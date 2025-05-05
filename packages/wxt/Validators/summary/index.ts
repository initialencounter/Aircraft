import { CheckResult, PekData, PekPkgInfo, PekUNNO, PkgInfoSubType, SekBtyType, SekData, SummaryData, EntrustData } from "../shared/types/index";
import {
  getBtyTypeCode,
  getIsCell,
  getIsIon,
  getIsSingleCell,
  getPkgInfo,
  getPkgInfoByPackCargo,
  getPkgInfoSubType,
  matchBatteryWeight,
  matchCapacity,
  matchNumber,
  matchVoltage,
  matchWattHour,
  parseNetWeight,
  pekIsDangerous,
  pkgInfoIsIA
} from "../shared/utils/index"
import { checkBatteryType } from "./checkBatteryType";
import { checkCapacity } from "./checkCapacity";
import { checkIssueDate } from "./checkIssueDate";
import { checkLiContent } from "./checkLiContent";
import { checkMass } from "./checkMass";
import { checkModel } from "./checkModel";
import { checkName } from "./checkName";
import { checkShape } from "./checkShape";
import { checkT7 } from "./checkT7";
import { checkTradeMark } from "./checkTradeMark";
import { checkVoltage } from "./checkVoltage";
import { checkWattHour } from "./checkWattHour";
import { checkProjectNo } from "./checkProjectNo";
import { checkConsignor } from "./checkConsignor";
import { checkManufacturer } from "./checkManufacturer";
import { checkMarket } from "./checkMarket";
import { checkUN38fg } from "./checkUN38fg";
import { checkPekGoods, checkSekGoods } from "./goods/index";
import { AttachmentInfo } from "../shared/types/attachment";
import { checkTitle } from "./checkTitle";
import { checkColor } from "./checkColor";

export function checkSekAttachment(currentData: SekData, attachmentInfo: AttachmentInfo, entrustData: EntrustData) {
  const summaryData = attachmentInfo.summary
  const goodsInfo = attachmentInfo.goods
  const checkMap = {
    '500': ['≤100Wh', '>100Wh'],
    '501': ['≤20Wh', '>20Wh'],
    '504': ['≤20Wh', '>20Wh'],
    '502': ['>2g', '≤2g'],
    '503': ['>1g', '≤1g'],
    '505': ['>1g', '≤1g']
  }
  const btyType = currentData['btyType'] as SekBtyType
  const {
    // 中文品名
    itemCName,
    // 英文品名
    itemEName,
    // 电池尺寸
    btySize,
    btyColor,
    // 电池形状
    // 锂离子电池 锂离子电芯 锂金属电池 锂金属电芯 单芯锂离子电池 单芯锂金属电池
    // '500'    | '501'    | '504'  |  '502'   | '503'       | '505'
    btyShape,
    // 电池型号
    btyKind,
    // 其他描述
    otherDescribe,
    // 备注
    comment,
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
  // 锂含量
  const liContent = matchNumber(currentData['inspectionItem1Text2'])
  // 净重 单位：g
  const netWeight = matchNumber(currentData['btyNetWeight'])
  // 真实显示净重数字 单位：g
  const netWeightDisplay = matchNumber(currentData['btyNetWeight']) * 1000
  // 毛重
  const btyGrossWeight = Number(currentData['btyGrossWeight'])
  // 描述
  const otherDescribeCAddition = currentData['otherDescribeCAddition']
  // 电池重量
  const batteryWeight = matchBatteryWeight(currentData['otherDescribeCAddition'])
  // 瓦时数或锂含量范围
  const inspectionResult1 = currentData['inspectionResult1']
  // 单芯电池或电芯
  const isSingleCell = getIsSingleCell(btyType)
  // UN编号
  const unno = currentData['unno'] as PekUNNO
  // 电芯
  const isCell: boolean = getIsCell(btyType)
  // 包装类型 0 965 1 966 2 967
  const packageType = ((otherDescribe === '540') ?
    '0' :
    (otherDescribe === '541') ?
      '1' :
      '2') as '0' | '1' | '2'
  // 是否锂离子电池
  const isIon = getIsIon(btyType)
  // 包装类型, 通过UN编号、电池类型、包装类型获取，录入错误的信息可能会导致判断错误
  const pkgInfo: PekPkgInfo = getPkgInfo(unno, isIon, packageType)
  // 参见包装说明，可能为空，通常来自于模板
  const unTest = String(currentData['inspectionResult2']) === '0'// UN38.3 测试
  const dropTest = String(currentData['inspectionResult5']) === "0"// 跌落
  // 包装等级
  const packageGrade = currentData['pg']
  // 结论
  const conclusions = Number(currentData['conclusions'])
  // 运输专有名称
  const properShippingName = currentData['psn']
  const according = currentData['according'] // 鉴定依据
  const otherDescribeChecked = currentData['otherDescribeChecked'] === '1'
  const btyBrand = currentData['btyBrand']
  let results: CheckResult[] = []
  results.push(...checkTitle(summaryData.title))
  results.push(...checkName(packageType, itemEName, itemCName, btyKind, summaryData.cnName))
  results.push(...checkBatteryType(btyType, summaryData.classification))
  results.push(...checkModel(btyKind, summaryData.type))
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
  results.push(...checkIssueDate(summaryData.issueDate, currentData.projectNo))
  results.push(...checkProjectNo(currentData.projectNo, summaryData.projectNo))
  results.push(...checkConsignor(entrustData.consignor, summaryData.consignor))
  results.push(...checkManufacturer(entrustData.manufacturer, summaryData.manufacturer))
  results.push(...checkMarket(market, summaryData.testReportNo))
  results.push(...checkUN38fg(summaryData.un38f, summaryData.un38g))
  results.push(...checkSekGoods(conclusions, unno, itemCName, currentData.projectNo, goodsInfo))
  return results
}
export function checkPekAttachment(currentData: PekData, attachmentInfo: AttachmentInfo, entrustData: EntrustData) {
  const summaryData = attachmentInfo.summary
  const goodsInfo = attachmentInfo.goods
  const btyType = getBtyTypeCode(currentData)
  // 品名
  const {
    // 品名
    itemCName,
    // 品名
    itemEName,
    // 操作信息
    otherDescribe,
    // 注意事项
    remarks,
    // 危险性类别
    classOrDiv,
    // 仅限货机
    packCargo,
    // 技术备注
    market
  } = currentData
  // 型号
  const btyKind = currentData['model']
  // 电压
  const voltage = matchNumber(currentData['inspectionItem2Text1'])
  // 容量
  const capacity = matchNumber(currentData['inspectionItem2Text2'])
  // 瓦时
  const wattHour = matchNumber(currentData['inspectionItem3Text1'])
  const wattHourFromName = matchWattHour(currentData['itemCName'])
  // 锂含量
  const liContent = matchNumber(currentData['inspectionItem4Text1'])
  // 电池数量
  const btyCount = matchNumber(currentData['btyCount'])
  // 净重 单位：g
  const netWeight = parseNetWeight(currentData['netWeight'])
  // 真实显示净重数字 单位：g
  const netWeightDisplay = matchNumber(currentData['netWeight']) * 1000
  // 描述
  const otherDescribeCAddition = currentData['otherDescribeCAddition']
  // 电池重量
  const batteryWeight = matchBatteryWeight(otherDescribeCAddition)
  // 单芯电池或电芯
  const isSingleCell = getIsSingleCell(btyType)
  // 电池颜色
  const btyColor = currentData['color']
  // 电池形状
  const btyShape = currentData['shape']
  // 电池尺寸
  const btySize = currentData['size']
  const inspectionItem3Text1 = currentData['inspectionItem3Text1']
  const inspectionItem4Text1 = currentData['inspectionItem4Text1']
  // UN编号
  const unno = currentData['unno'] as PekUNNO
  // 电芯
  const isCell: boolean = String(currentData['type2']) === '1'
  // 运输专有名称
  const properShippingName = currentData['psn']
  // 包装类型
  const packageGrade = currentData['pg']
  // 客货机
  const packPassengerCargo = currentData['packPassengerCargo']
  // 包装类型 0 965 1 966 2 967
  const packageType = String(currentData['inspectionItem1']) as
    | '0'
    | '1'
    | '2'
  // 是否锂离子电池
  const isIon = String(currentData['type1']) === '1'
  // 包装类型, 通过UN编号、电池类型、包装类型获取，录入错误的信息可能会导致判断错误
  const pkgInfo: PekPkgInfo = getPkgInfo(unno, isIon, packageType)
  // 参见包装说明，可能为空，通常来自于模板
  const pkgInfoReference: PekPkgInfo = currentData['inspectionItem5Text1']
  // 结论的包装类型，通常来自于模板
  const pkgInfoByPackCargo: PekPkgInfo = getPkgInfoByPackCargo(pkgInfoReference, packCargo)
  // 第二个包装说明，可能为空, 可以区分I II IA IB，通常来自于模板
  const pkgInfoSubType: PkgInfoSubType = getPkgInfoSubType(pkgInfoReference, packCargo)
  const stackTest = String(currentData['inspectionItem6']) === '1'// 堆码
  const stackTestEvaluation = otherDescribe.includes('2c9180849267773c0192dc73c77e5fb2')
  const dropTest = String(currentData['inspectionItem2']) === '1'// 跌落
  const liBtyLabel = String(currentData['inspectionItem4']) === '1' // 锂电池标记
  const unTest = String(currentData['inspectionItem3']) === '1' // 锂电池已通过 UN38.3 测试
  const randomFile = String(currentData['inspectionItem5']) === '1' // 是否含随附文件
  // 是否为充电盒或关联报告
  const isChargeBoxOrRelated = otherDescribeCAddition.includes('总净重')
  // 是否为危险品，通过包装、电池瓦时、锂含量、净重、电芯类型判断
  const isDangerous = pekIsDangerous(
    wattHour,
    pkgInfo,
    liContent,
    netWeight,
    isSingleCell
  )
  const isIA = pkgInfoIsIA(wattHour, pkgInfo, liContent, netWeight, isSingleCell)
  const btyBrand = currentData['brands']
  let results: CheckResult[] = []
  results.push(...checkTitle(summaryData.title))
  results.push(...checkName(packageType, itemEName, itemCName, btyKind, summaryData.cnName))
  results.push(...checkBatteryType(btyType, summaryData.classification))
  results.push(...checkModel(btyKind, summaryData.type))
  results.push(...checkTradeMark(btyBrand, summaryData.trademark))
  results.push(...checkVoltage(voltage, summaryData.voltage))
  results.push(...checkCapacity(capacity, summaryData.capacity))
  results.push(...checkWattHour(wattHour, summaryData.watt))
  results.push(...checkShape(btyShape, summaryData.shape))
  results.push(...checkColor(btyColor, summaryData.shape))
  results.push(...checkMass(batteryWeight, summaryData.mass))
  results.push(...checkLiContent(liContent, summaryData.licontent))
  results.push(...checkT7(btyType, summaryData.test7, summaryData.note))
  results.push(...checkIssueDate(summaryData.issueDate, currentData.projectNo))
  results.push(...checkProjectNo(currentData.projectNo, summaryData.projectNo))
  results.push(...checkConsignor(entrustData.consignor, summaryData.consignor))
  results.push(...checkManufacturer(entrustData.manufacturer, summaryData.manufacturer))
  results.push(...checkMarket(market, summaryData.testReportNo))
  results.push(...checkUN38fg(summaryData.un38f, summaryData.un38g))
  results.push(...checkPekGoods(pkgInfoSubType, netWeight, itemCName, currentData.projectNo, goodsInfo))
  return results
}
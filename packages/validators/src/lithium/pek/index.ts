import { baseCheck } from '../shared'
import type {
  CheckResult,
  PekData,
  PekPkgInfo,
  PekUNNO,
  PkgInfoSubType,
} from '../shared/types'
import {
  getBtyTypeCode,
  getIsSingleCell,
  getPkgInfo,
  getPkgInfoByPackCargo,
  getPkgInfoSubType,
  matchBatteryWeight,
  matchNumber,
  matchWattHour,
  parseNetWeight,
  pekIsDangerous,
  pkgInfoIsIA,
} from '../shared/utils'
import { activeStateWarn } from './activeStateWarn'
import { chargingCase967II } from './chargingCase967II'
import { conclusionsCheck } from './conclusionsCheck'
import { dropStackTest } from './dropStackTest'
import { IAIBCheck } from './IAIBCheck'
import { ionOrMetal } from './ionOrMetal'
import { isNaNCheck } from './isNaNCheck'
import { liBtyLabelCheck } from './liBtyLabelCheck'
import { netWeighLimit } from './netWeighLimit'
import { otherDescribeIsCell } from './otherDescribeIsCell'
import { packetOrContain } from './packetOrContain'
import { remarksCheck } from './remarksCheck'
import { stateOfCharge } from './stateOfCharge'

function checkPekBtyType(currentData: PekData, projectYear?: string): CheckResult[] {
  const result = []
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
  const inspectionItem1 = String(currentData['inspectionItem1']) as
    | '0'
    | '1'
    | '2'
  // 是否锂离子电池
  const isIon = String(currentData['type1']) === '1'
  // 包装类型, 通过UN编号、电池类型、包装类型获取，录入错误的信息可能会导致判断错误
  const pkgInfo: PekPkgInfo = getPkgInfo(unno, isIon, inspectionItem1)
  // 参见包装说明，可能为空，通常来自模板
  const pkgInfoReference: PekPkgInfo = currentData['inspectionItem5Text1']
  // 结论的包装类型，通常来自模板
  const pkgInfoByPackCargo: PekPkgInfo = getPkgInfoByPackCargo(
    pkgInfoReference,
    packCargo
  )
  // 第二个包装说明，可能为空, 可以区分I II IA IB，通常来自模板
  const pkgInfoSubType: PkgInfoSubType = getPkgInfoSubType(
    pkgInfoReference,
    packCargo
  )
  const stackTest = String(currentData['inspectionItem6']) === '1' // 堆码
  const stackTestEvaluation = otherDescribe.includes(
    '2c9180849267773c0192dc73c77e5fb2'
  )
  const dropTest = String(currentData['inspectionItem2']) === '1' // 跌落
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
  const isIA = pkgInfoIsIA(
    wattHour,
    pkgInfo,
    liContent,
    netWeight,
    isSingleCell
  )
  const isChargingCase = pkgInfoSubType === '966, II' &&
    otherDescribeCAddition.includes('耳机') && otherDescribeCAddition.includes('总净重') && (otherDescribeCAddition.includes('充电盒') || otherDescribeCAddition.includes('充电仓'))
  result.push(...chargingCase967II(isChargingCase, otherDescribeCAddition))
  if (!itemCName) result.push({ ok: false, result: '中文品名为空' })
  if (!itemEName) result.push({ ok: false, result: '英文品名为空' })
  if (!btyKind) result.push({ ok: false, result: '电池型号为空' })
  if (netWeight === 0) result.push({ ok: false, result: '电池净重为空' })
  if (!unTest) result.push({ ok: false, result: '未勾选通过 UN38.3 测试' })
  if (pkgInfoSubType === '') result.push({ ok: false, result: '包装说明为空' })
  if (!market) result.push({ ok: false, result: '技术备注为空' })
  if (randomFile)
    result.push({ ok: false, result: '检查项目6错误，附有随机文件应为：否' })

  if (currentData['otherDescribeChecked'] !== '1')
    result.push({ ok: false, result: '应勾选附加操作信息' })
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
      inspectionItem1
    )
  )
  // 电池净重限重
  result.push(...netWeighLimit(netWeight, pkgInfoSubType))
  // 开启状态运输
  result.push(...activeStateWarn(otherDescribe))
  // 荷电状态≤30%
  result.push(...stateOfCharge(pkgInfoSubType, otherDescribe, wattHour, unno, isChargingCase, projectYear))
  // 其他描述是否为电芯或电池
  result.push(...otherDescribeIsCell(isCell, otherDescribe))
  // 包装与其他描述验证
  result.push(
    ...packetOrContain(
      pkgInfo,
      pkgInfoByPackCargo,
      otherDescribeCAddition,
      isChargeBoxOrRelated
    )
  )
  // 跌落和堆码检测
  result.push(
    ...dropStackTest(pkgInfoSubType, stackTest, dropTest, stackTestEvaluation)
  )
  // 检查项目5 是否加贴锂电池标记
  result.push(...liBtyLabelCheck(pkgInfoSubType, btyShape, liBtyLabel))

  // 包装说明
  if (isDangerous) {
    if (pkgInfoReference !== '') {
      result.push({ ok: false, result: '危险品，参见包装说明应为空' })
    }
  } else {
    if (isNaN(Number(pkgInfoReference))) {
      result.push({ ok: false, result: '非限制性，包装说明应为数字' })
    }
  }
  // 鉴别项目1
  result.push(...ionOrMetal(isIon, inspectionItem3Text1, inspectionItem4Text1))

  // 验证瓦数数
  if (wattHourFromName > 0 && !isNaN(wattHour) && isIon) {
    if (wattHour !== wattHourFromName)
      result.push({
        ok: false,
        result: `瓦时数与项目名称不匹配: ${wattHour} !== ${wattHourFromName}`,
      })
  }

  // 注意事项
  result.push(...remarksCheck(remarks, pkgInfoSubType))

  // 结论 非限制性 0 危险品 1
  const conclusions = Number(currentData['conclusions'])
  // DGR规定,资料核实
  const result1 = currentData['result1']
  if (result1 !== 'DGR规定,资料核实')
    result.push({ ok: false, result: '【DGR规定，资料核实】栏错误，勾选错误' })
  // 是否属于危险品
  // 危险品
  result.push(
    ...conclusionsCheck(
      conclusions,
      isDangerous,
      pkgInfoByPackCargo,
      pkgInfo,
      unno,
      netWeight,
      packPassengerCargo,
      classOrDiv,
      pkgInfoReference,
      isIon,
      packCargo,
      inspectionItem1,
      properShippingName,
      packageGrade
    )
  )
  // 瓦时数、净重、锂含量、电芯类型是否为数字
  result.push(...isNaNCheck(isIon, wattHour, liContent, netWeight))
  // 965 IA IB
  result.push(...IAIBCheck(isIA, pkgInfoSubType))
  return result
}

export { checkPekBtyType }

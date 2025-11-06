import type { CheckResult } from './types'

/**
 * 电芯或电池检测
 * @param isCell 是否为电芯
 * @param otherDescribeCAddition 其他描述补充
 * @param isChargeBoxOrRelated 是否为充电盒或关联报告
 * @returns
 */
export function cellOrBattery(
  isCell: boolean,
  otherDescribeCAddition: string,
  isChargeBoxOrRelated: boolean
): CheckResult[] {
  const result: CheckResult[] = []
  if (isChargeBoxOrRelated) return result
  if (isCell) {
    if (otherDescribeCAddition.includes('单块电池')
      || otherDescribeCAddition.includes('块电池')
      || otherDescribeCAddition.includes('内置电池')
      || otherDescribeCAddition.includes('外配电池')) {
      result.push({ ok: false, result: '类型为电芯时，描述中不应该出现电池' })
    }
  } else {
    if (otherDescribeCAddition.includes('单块电芯')
      || otherDescribeCAddition.includes('块电芯')
      || otherDescribeCAddition.includes('内置电芯')
      || otherDescribeCAddition.includes('外配电芯')) {
      result.push({ ok: false, result: '类型为电池时，描述中不应该出现电芯' })
    }
  }
  return result
}

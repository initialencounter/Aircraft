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
  if (
    isCell &&
    !otherDescribeCAddition.includes('单块电芯') &&
    !isChargeBoxOrRelated
  )
    result.push({ ok: false, result: '物品为电芯时，描述中不应该出现单块电池' })
  if (
    !isCell &&
    !otherDescribeCAddition.includes('单块电池') &&
    !isChargeBoxOrRelated
  )
    result.push({ ok: false, result: '物品为电池时，描述中不应该出现单块电芯' })
  return result
}

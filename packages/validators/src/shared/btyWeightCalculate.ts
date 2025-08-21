import type { CheckResult } from './types'

/**
 * 电池净重计算
 * @param batteryWeight 电池重量
 * @param btyCount 电池数量
 * @param netWeightDisplay 净重
 * @returns
 */
export function btyWeightCalculate(
  batteryWeight: number,
  btyCount: number,
  netWeightDisplay: number
): CheckResult[] {
  // 电池净重
  if (batteryWeight && btyCount && netWeightDisplay) {
    const expectedNetWeight = batteryWeight * btyCount
    const abs = Math.abs(
      (expectedNetWeight - netWeightDisplay) / netWeightDisplay
    )
    if (abs > 0.05) {
      return [{ ok: false, result: '电池净重误差大于5%' }]
    }
  }
  return []
}

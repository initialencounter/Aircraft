import { CheckResult } from "./types/index"

/**
 * 电池净重计算
 * @param batteryWeight 电池重量
 * @param btyCount 电池数量
 * @param netWeightDisplay 净重
 * @returns 
 */
export function btyWeightCalculate(batteryWeight: number, btyCount: number, netWeightDisplay: number): CheckResult[] {
  // 电池净重
  if (batteryWeight && btyCount && netWeightDisplay) {
    let expectedNetWeight = batteryWeight * btyCount
    let abs = Math.abs((expectedNetWeight - netWeightDisplay) / netWeightDisplay)
    if (abs > 0.05 && btyCount > 1) {
      return [{ ok: false, result: '电池净重误差大于5%' }]
    }
  }
  return []
}

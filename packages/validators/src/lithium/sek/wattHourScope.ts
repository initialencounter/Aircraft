import type { CheckResult } from '../shared/types'

/**
 * 瓦时数范围检测
 * @param btyType 电池类型
 * @param inspectionResult1 瓦时数范围
 * @param wattHourFromName 瓦时数
 * @returns
 */
export function wattHourScope(
  btyType: string,
  inspectionResult1: string,
  wattHourFromName: number,
  selector: string,
): CheckResult[] {
  const result: CheckResult[] = []
  if (['501', '504', '601', '602'].includes(btyType)) {
    if (wattHourFromName > 20) {
      if (inspectionResult1 !== '>20Wh')
        result.push({ ok: false, result: '瓦时数结果错误，应为>20Wh', selector })
    } else {
      if (inspectionResult1 !== '≤20Wh')
        result.push({ ok: false, result: '瓦时数结果错误，应为≤20Wh', selector })
    }
  } else {
    if (wattHourFromName > 100) {
      if (inspectionResult1 !== '>100Wh')
        result.push({ ok: false, result: '瓦时数结果错误，应为>100Wh', selector })
    } else {
      if (inspectionResult1 !== '≤100Wh')
        result.push({ ok: false, result: '瓦时数结果错误，应为≤100Wh', selector })
    }
  }
  return result
}

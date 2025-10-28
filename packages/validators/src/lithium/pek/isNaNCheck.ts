import type { CheckResult } from '../shared/types'

/**
 * 非数字检测
 * @param isIon 是否为锂离子电池
 * @param wattHour 瓦时数
 * @param liContent 锂含量
 * @param netWeight 净重
 * @returns
 */
export function isNaNCheck(
  isIon: boolean,
  wattHour: number,
  liContent: number,
  netWeight: number
): CheckResult[] {
  const result: CheckResult[] = []
  if (isIon) {
    if (isNaN(wattHour) || isNaN(netWeight)) {
      result.push({
        ok: false,
        result: '瓦时数，净重，二者中有非数字，表单验证可能不准确',
      })
    }
  } else {
    if (isNaN(liContent) || isNaN(netWeight)) {
      result.push({
        ok: false,
        result: '锂含量，净重，二者中有非数字，表单验证可能不准确',
      })
    }
  }
  return result
}

import type { CheckResult } from '../shared/types'

/**
 * 净重限制
 * @param netWeight 净重
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @returns
 */
export function netWeighLimit(
  netWeight: number,
  pkgInfoSubType: string
): CheckResult[] {
  const result: CheckResult[] = []
  // 电池净重
  if (!isNaN(netWeight)) {
    if (netWeight > 35) {
      if (
        pkgInfoSubType === '965, IA' ||
        pkgInfoSubType === '966, I' ||
        pkgInfoSubType === '967, I' ||
        pkgInfoSubType === '968, IA' ||
        pkgInfoSubType === '969, I' ||
        pkgInfoSubType === '970, I'
      ) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过35kg` })
      }
    } else if (netWeight > 10) {
      if (pkgInfoSubType === '965, IB') {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过10kg` })
      }
    } else if (netWeight > 5) {
      if (
        pkgInfoSubType === '966, II' ||
        pkgInfoSubType === '967, II' ||
        pkgInfoSubType === '969, II' ||
        pkgInfoSubType === '970, II'
      ) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过5kg` })
      }
    } else if (netWeight > 2.5) {
      if (pkgInfoSubType === '968, IB') {
        result.push({ ok: false, result: '968，IB 电池净重超过2.5kg' })
      }
    }
  }
  return result
}

import type { CheckResult, PkgInfoSubType } from '../shared/types'

/**
 * 净重限制
 * @param netWeight 净重
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @returns
 */
export function netWeighLimit(
  netWeight: number,
  pkgInfoSubType: PkgInfoSubType
): CheckResult[] {
  const result: CheckResult[] = []
  // 电池净重
  if (isNaN(netWeight)) {
    return result
  }
  switch (pkgInfoSubType) {
    case '965, IA':
    case '966, I':
    case '967, I':
    case '968, IA':
    case '969, I':
    case '970, I':
    case '976':
    case '978, I':
    case '977, I':
      if (netWeight > 35) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过35kg` })
      }
      break
    case '965, IB':
      if (netWeight > 10) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过10kg` })
      }
      break
    case '966, II':
    case '967, II':
    case '969, II':
    case '970, II':
    case '977, II':
    case '978, II':
      if (netWeight > 5) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过5kg` })
      }
      break
    case '968, IB':
      if (netWeight > 2.5) {
        result.push({ ok: false, result: '968，IB 电池净重超过2.5kg' })
      }
      break
  }
  return result
}

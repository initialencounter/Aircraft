import { CheckResult } from '../../lithium/shared/types'
import { SodiumPkgInfoSubType } from '../shared/types'

/**
 * 净重限制
 * @param netWeight 净重
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @returns
 */
export function pekSodiumBatteryNetWeighLimit(
  netWeight: number,
  pkgInfoSubType: SodiumPkgInfoSubType
): CheckResult[] {
  const result: CheckResult[] = []
  // 电池净重
  if (!isNaN(netWeight)) {
    if (netWeight > 35) {
      if (
        pkgInfoSubType === '976'
        || pkgInfoSubType === '977, I'
        || pkgInfoSubType === '978, I'
      ) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过35kg` })
      }
    } else if (netWeight > 5) {
      if (
        pkgInfoSubType === '977, II' ||
        pkgInfoSubType === '978, II'
      ) {
        result.push({ ok: false, result: `${pkgInfoSubType} 电池净重超过5kg` })
      }
    }
  }
  return result
}

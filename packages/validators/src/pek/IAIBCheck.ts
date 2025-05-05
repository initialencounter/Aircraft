import type { PkgInfoSubType, CheckResult } from '../shared/types'

/**
 * 965 IA IB
 * @param isIA 是否为IA
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @returns
 */
export function IAIBCheck(
  isIA: boolean,
  pkgInfoSubType: PkgInfoSubType
): CheckResult[] {
  const result: CheckResult[] = []
  if (isIA) {
    if (pkgInfoSubType === '965, IB' || pkgInfoSubType === '968, IB') {
      result.push({ ok: false, result: '应为IA' })
    }
  } else {
    if (pkgInfoSubType === '965, IA' || pkgInfoSubType === '968, IA') {
      result.push({ ok: false, result: '应为IB' })
    }
  }
  return result
}

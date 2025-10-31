import { CheckResult } from '../../lithium/shared/types'
import type { SodiumPkgInfoSubType } from '../shared/types'

/**
 * 跌落和堆码检测
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @param stackTest 堆码
 * @param dropTest 跌落
 * @returns
 */
export function pekSodiumDropStackTest(
  pkgInfoSubType: SodiumPkgInfoSubType,
  stackTest: boolean,
  dropTest: boolean,
): CheckResult[] {
  const result: CheckResult[] = []
  // 不需要堆码的包装
  if (stackTest) {
    result.push({ ok: false, result: `${pkgInfoSubType}不应勾选堆码` })
  }

  // 要跌落的包装
  if (['977, II'].includes(pkgInfoSubType)) {
    if (!dropTest) {
      result.push({ ok: false, result: `${pkgInfoSubType}未勾选跌落` })
    }
  } else {
    if (dropTest) {
      result.push({ ok: false, result: `${pkgInfoSubType}不应勾选跌落` })
    }
  }
  return result
}

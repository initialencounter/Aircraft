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
  if (['952', '976', '977, I'].includes(pkgInfoSubType)) {
    if (stackTest) {
      result.push({ ok: false, result: `${pkgInfoSubType}不应勾选堆码` })
    }
  } else {
    // 需要堆码或堆码评估单的包装
    if (
      ['967, I', '970, I', '967, II', '970, II', '966, II', '969, II'].includes(
        pkgInfoSubType
      )
    ) {
      if (!stackTest) {
        result.push({
          ok: false,
          result: `${pkgInfoSubType} 未勾选堆码或堆码评估`,
        })
      }
    }
    // 只能勾选堆码，不能勾选堆码评估
    if (pkgInfoSubType === '965, IB' || pkgInfoSubType === '968, IB') {
      if (!stackTest) {
        result.push({ ok: false, result: `${pkgInfoSubType}未勾选堆码` })
      }
      if (stackTestEvaluation) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选堆码评估` })
      }
    }
  }

  // 要跌落的包装
  if (['965, IB', '968, IB', '966, II', '969, II'].includes(pkgInfoSubType)) {
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

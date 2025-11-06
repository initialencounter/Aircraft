import type { CheckResult, PkgInfoSubType } from '../shared/types'

/**
 * 跌落和堆码检测
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @param dropTest 跌落
 * @param stackTestEvaluation 堆码评估
 * @returns
 */
export function checkDropTest(
  pkgInfoSubType: PkgInfoSubType,
  dropTest: boolean,
): CheckResult[] {
  const result: CheckResult[] = []

  switch (pkgInfoSubType) {
    // 要跌落的包装
    case '965, IB':
    case '968, IB':
    case '966, II':
    case '969, II':
    case '977, II':
      if (!dropTest) {
        result.push({ ok: false, result: `${pkgInfoSubType}未勾选跌落` })
      }
      break
    default:
      if (dropTest) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选跌落` })
      }
  }
  return result
}

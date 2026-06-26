import type { CheckResult, PkgInfoSubType } from '../shared/types'

/**
 * 跌落和堆码检测
 * @param pkgInfoSubType 带有IA IB的包装说明
 * @param stackTest 堆码
 * @param dropTest 跌落
 * @param stackTestEvaluation 堆码评估
 * @returns
 */
export function checkStackTest(
  pkgInfoSubType: PkgInfoSubType,
  stackTest: boolean,
  stackTestEvaluation: boolean
): CheckResult[] {
  const result: CheckResult[] = []

  if (stackTest && stackTestEvaluation) {
    result.push({ ok: false, result: '重复勾选堆码和堆码评估单' })
  }

  switch (pkgInfoSubType) {
    // 需要堆码或堆码评估单的包装
    case '967, I':
    case '970, I':
    case '967, II':
    case '970, II':
    case '966, II':
    case '969, II':
      if (!stackTest && !stackTestEvaluation) {
        result.push({
          ok: false,
          result: `${pkgInfoSubType} 未勾选堆码或堆码评估单`,
        })
      }
      break
    // 只能勾选堆码，不能勾选堆码评估
    case '965, IB':
    case '968, IB':
      if (!stackTest) {
        result.push({ ok: false, result: `${pkgInfoSubType}未勾选堆码` })
      }
      break
    default:
      if (stackTest) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选堆码` })
      }
      if (stackTestEvaluation) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选堆码评估单` })
      }
  }
  return result
}

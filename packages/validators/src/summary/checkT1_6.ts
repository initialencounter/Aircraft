import type { CheckResult, SummaryInfo } from '../lithium/shared/types'

export function checkT1_6(
  summaryData: SummaryInfo,
): CheckResult[] {
  const results: CheckResult[] = []
  for (let i = 1; i <= 6; i++) {
    let testResult = summaryData[`test${i}` as keyof typeof summaryData] as string
    if (testResult.includes('不适用')) {
      results.push({
        ok: false,
        result: `概要T${i}测试结果为不适用, 请确认是否正确`,
      })
    }
  }
  return results
}

import type { SummaryFromLLM } from '../shared/types'
import type { CheckResult } from '../shared/types'

export function checkT1_8(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryFromLLM
): CheckResult[] {
  const results: CheckResult[] = []
  for (let i = 1; i < 9; i++) {
    const llmState = Boolean(summaryFromLLM[`test${i}` as keyof SummaryFromLLM])
    const summaryState = summaryInfo[`test${i}` as keyof SummaryFromLLM] as boolean
    if (llmState) {
      if (!summaryState) {
        results.push({
          ok: false,
          result: `概要上的T${i}为${summaryState}，但是UN报告上的T${i}为通过`,
        })
      }
    } else {
      if (summaryState) {
        results.push({
          ok: false,
          result: `概要上的T${i}为${summaryState}，但是UN报告上的T${i}为不适用`,
        })
      }
    }
  }
  return results
}

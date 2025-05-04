import type { SummaryInfo } from 'aircraft-rs'
import type { SummaryFromLLM } from '../../types'
import type { CheckResult } from '../shared/types'

export function checkT1_8(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryInfo
): CheckResult[] {
  const results: CheckResult[] = []
  for (let i = 1; i < 9; i++) {
    const llmState = Boolean(summaryFromLLM[`test${i}` as keyof SummaryFromLLM])
    const summaryText = summaryInfo[`test${i}` as keyof SummaryInfo] as string
    if (llmState) {
      if (summaryText.includes('不适用')) {
        results.push({
          ok: false,
          result: `概要上的T${i}为${summaryText}，但是UN报告上的T${i}为通过`,
        })
      }
    } else {
      if (summaryText.includes('通过')) {
        results.push({
          ok: false,
          result: `概要上的T${i}为${summaryText}，但是UN报告上的T${i}为不适用`,
        })
      }
    }
  }
  return results
}

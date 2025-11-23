import type { SummaryFromLLM, SummaryInfo } from '../shared/types'
import type { CheckResult } from '../shared/types'

const baseCheckItem: Array<keyof SummaryFromLLM> = [
  'model',
  'testReportNo',
  'testDate',
]
export function baseCheck(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryInfo
): CheckResult[] {
  const results: CheckResult[] = []
  for (const item of baseCheckItem) {
    const valueFromLLM = String(summaryFromLLM[item] as string).trim()
    const valueFromInfo = summaryInfo[item as keyof SummaryInfo] as string
    if (valueFromInfo !== valueFromLLM) {
      results.push({
        ok: false,
        result: `UN报告上的${item}为${valueFromLLM}，概要中为${valueFromInfo}`,
      })
    }
  }
  return results
}

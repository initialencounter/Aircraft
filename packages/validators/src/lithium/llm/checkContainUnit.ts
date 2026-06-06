import type { SummaryFromLLM } from '../shared/types'
import type { CheckResult } from '../shared/types'

const containUnitItem = ['voltage', 'capacity', 'watt', 'mass', 'licontent']

export function checkContainUnit(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryFromLLM
): CheckResult[] {
  const results: CheckResult[] = []
  for (let i = 0; i < containUnitItem.length; i++) {
    const item = containUnitItem[i]
    if (!item) continue
    const valueFromLLM = Number(summaryFromLLM[item as keyof SummaryFromLLM])
    const valueFromSummary = Number(summaryInfo[item as keyof SummaryFromLLM])
    if (valueFromLLM !== valueFromSummary) {
      results.push({
        ok: false,
        result: `UN报告上的${item}为 ${valueFromLLM}，概要中为 ${valueFromSummary}`,
        selector: '',
      })
    }
  }
  return results
}

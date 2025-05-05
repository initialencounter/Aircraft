
import { SummaryFromLLM, SummaryInfo } from '../shared/types/attachment';
import { CheckResult } from '../shared/types/index'

const baseCheckItem: Array<keyof SummaryFromLLM> = ["type", "testReportNo", "testDate"]
export function baseCheck(summaryFromLLM: SummaryFromLLM, summaryInfo: SummaryInfo): CheckResult[] {
  let results: CheckResult[] = []
  for (let item of baseCheckItem) {
    let valueFromLLM = String(summaryFromLLM[item] as string).trim()
    let valueFromInfo = (summaryInfo[item as keyof SummaryInfo] as string)
    if (valueFromInfo !== valueFromLLM) {
      results.push({
        ok: false,
        result: `UN报告上的${item}为${valueFromLLM}，概要中为${valueFromInfo}`
      })
    }
  }
  return results
}
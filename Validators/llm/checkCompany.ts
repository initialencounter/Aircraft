import { SummaryFromLLM, SummaryInfo } from "../shared/types/attachment"
import { CheckResult } from "../shared/types/index"

export function checkCompany(summaryFromLLM: SummaryFromLLM, summaryInfo: SummaryInfo): CheckResult[] {
  let results: CheckResult[] = []
  if (!summaryInfo.testLab.includes(String(summaryFromLLM.testLab))) {
    results.push({
      ok: false,
      result: `UN报告上的测试单位为:${summaryFromLLM.testLab}，概要上的为:${summaryInfo.testLab.slice(0, 20)}`
    })
  }
  if (!summaryInfo.manufacturer.includes(String(summaryFromLLM.manufacturerCName))) {
    results.push({
      ok: false,
      result: `UN报告上的生产单位为:${summaryFromLLM.manufacturerCName}，概要上的为:${summaryInfo.manufacturer.slice(0, 20)}`
    })
  }
  return results
}
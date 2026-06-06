import type { CheckResult } from '../shared/types'

export function checkCompany(
  reportTestLab: string,
  reportManufacturer: string,
  summaryTestLab: string,
  summaryManufacturer: string,
): CheckResult[] {
  const results: CheckResult[] = []
  if (!summaryTestLab.includes(reportTestLab)) {
    results.push({
      ok: false,
      result: `UN报告上的测试单位为:${reportTestLab}，概要上的为:${summaryTestLab.slice(0, 20)}`,
      selector: '',
    })
  }
  if (
    !summaryManufacturer.includes(reportManufacturer)
  ) {
    results.push({
      ok: false,
      result: `UN报告上的生产单位为:${reportManufacturer}，概要上的为:${summaryManufacturer.slice(0, 20)}`,
      selector: '',
    })
  }
  return results
}

import type { CheckResult } from '../lithium/shared/types'

function replaceSpace(str: string) {
  return str.replace(/\s+/g, '')
}

export function checkMarket(
  market: string,
  summaryReportNo: string
): CheckResult[] {
  market = replaceSpace(market)
  summaryReportNo = replaceSpace(summaryReportNo)
  if (market !== summaryReportNo) {
    return [
      {
        ok: false,
        result: `技术备注: ${market} 与测试报告编号: ${summaryReportNo} 不一致`,
      },
    ]
  }
  return []
}

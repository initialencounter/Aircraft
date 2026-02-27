import type { CheckResult } from '../shared/types'

export function checkName(
  llmCName: string,
  llmEName: string,
  summaryCName: string,
  summaryEName: string,
): CheckResult[] {
  const result: CheckResult[] = []
  if (!summaryEName) {
    summaryEName = summaryCName
  }
  if (!summaryCName.includes(String(llmCName))) {
    result.push({
      ok: false,
      result: `UN报告上的电池中文名称为 ${llmCName}, 概要上为${summaryCName}`,
    })
  }
  if (!summaryEName.includes(String(llmEName))) {
    result.push({
      ok: false,
      result: `UN报告上的电池英文名称为 ${llmEName}, 概要上为${summaryEName}`,
    })
  }
  return result
}

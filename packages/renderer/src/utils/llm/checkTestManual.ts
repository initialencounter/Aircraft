import type { CheckResult } from '../shared/types'
import { matchTestManual } from '../shared/utils/matchDevice'

export function checkTestManual(
  rawTestManualLLM: string,
  rawTestManual: string
): CheckResult[] {
  let testManual = rawTestManual.trim()
  testManual = matchTestManual(testManual)
  if (!rawTestManualLLM && !testManual) {
    return [
      {
        ok: false,
        result: '未匹配到UN38.3测试标准，请反馈问题给开发人员',
      },
    ]
  }
  console.log('raw input', rawTestManualLLM, rawTestManual)
  console.log('match from docx', testManual)
  if (rawTestManualLLM !== testManual) {
    return [
      {
        ok: false,
        result: `UN报告上的测试标准为:${rawTestManualLLM}，概要上的为:${rawTestManual}`,
      },
    ]
  }
  return []
}

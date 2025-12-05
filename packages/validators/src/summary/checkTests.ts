import type { AttachmentInfo, CheckResult } from '../lithium/shared/types'

export function checkTests(
  summaryData: AttachmentInfo["summary"],
): CheckResult[] {
  const results: CheckResult[] = []
  for (let testNum = 1; testNum <= 8; testNum++) {
    if (!summaryData[`test${testNum}` as keyof typeof summaryData]) {
      results.push({
        ok: false,
        result: `概要测试项T${testNum}缺失`,
      })
    }else {
      console.log(`概要测试项T${testNum}存在`)
    }
  }
  return results
}

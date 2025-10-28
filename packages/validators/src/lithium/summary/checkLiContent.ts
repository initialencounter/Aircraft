import type { CheckResult } from '../shared/types'
import { matchBatteryWeight } from '../shared/utils'

export function checkLiContent(
  formLiContent: number,
  summaryLiContent: string
): CheckResult[] {
  const summaryLiContentNumber = matchBatteryWeight(
    '为' + summaryLiContent.trim()
  )
  if (isNaN(summaryLiContentNumber) || isNaN(formLiContent)) return []
  if (summaryLiContentNumber !== formLiContent) {
    return [
      {
        ok: false,
        result: `锂含量不一致, 系统上为${formLiContent}g, 概要上为${summaryLiContentNumber}g`,
      },
    ]
  }
  return []
}

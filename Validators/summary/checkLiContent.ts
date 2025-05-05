import { CheckResult } from "../shared/types/index"
import { matchBatteryWeight } from "../shared/utils/index"

export function checkLiContent(formLiContent: number, summaryLiContent: string): CheckResult[] {
  let summaryLiContentNumber = matchBatteryWeight("为" + summaryLiContent.trim())
  if (isNaN(summaryLiContentNumber) || isNaN(formLiContent)) return []
  if (summaryLiContentNumber !== formLiContent) {
    return [{
      ok: false,
      result: `锂含量不一致, 系统上为${formLiContent}g, 概要上为${summaryLiContentNumber}g`
    }]
  }
  return []
} 
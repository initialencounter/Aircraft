import { CheckResult } from "../shared/types/index"
import { matchCapacity } from "../shared/utils/index"

export function checkCapacity(formCapacity: number, summaryCapacity: string): CheckResult[] {
  let summaryCapacityNumber = matchCapacity(summaryCapacity.trim())
  if (summaryCapacityNumber !== formCapacity) {
    return [{
      ok: false,
      result: `容量不一致, 系统上为${formCapacity}, 概要上为${summaryCapacityNumber}`
    }]
  }
  return []
} 
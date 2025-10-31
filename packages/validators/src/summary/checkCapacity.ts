import type { CheckResult } from '../lithium/shared/types'
import { matchCapacity } from '../lithium/shared/utils'

export function checkCapacity(
  formCapacity: number,
  summaryCapacity: string
): CheckResult[] {
  const summaryCapacityNumber = matchCapacity(summaryCapacity.trim())
  if (summaryCapacityNumber !== formCapacity) {
    return [
      {
        ok: false,
        result: `容量不一致, 系统上为${formCapacity}, 概要上为${summaryCapacityNumber}`,
      },
    ]
  }
  return []
}

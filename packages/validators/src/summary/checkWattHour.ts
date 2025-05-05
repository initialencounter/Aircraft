import type { CheckResult } from '../shared/types'
import { matchWattHour } from '../shared/utils'

export function checkWattHour(
  formWattHour: number,
  summaryWattHour: string
): CheckResult[] {
  const summaryWattHourNumber = matchWattHour(' ' + summaryWattHour.trim())
  if (summaryWattHourNumber !== formWattHour) {
    return [
      {
        ok: false,
        result: `瓦时不一致, 系统上为${formWattHour}, 概要上为${summaryWattHourNumber}`,
      },
    ]
  }
  return []
}

import { CheckResult } from "../shared/types/index"
import { matchWattHour } from "../shared/utils/index"

export function checkWattHour(formWattHour: number, summaryWattHour: string): CheckResult[] {
  let summaryWattHourNumber = matchWattHour(' ' + summaryWattHour.trim())
  if (summaryWattHourNumber !== formWattHour) {
    return [{
      ok: false,
      result: `瓦时不一致, 系统上为${formWattHour}, 概要上为${summaryWattHourNumber}`
    }]
  }
  return []
}
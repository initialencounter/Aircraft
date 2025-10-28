import type { CheckResult } from '../shared/types'
import { matchBatteryWeight } from '../shared/utils'

export function checkMass(
  formMass: number,
  summaryMass: string
): CheckResult[] {
  const summaryMassNumber = matchBatteryWeight('为' + summaryMass.trim())
  if (summaryMassNumber !== formMass) {
    return [
      {
        ok: false,
        result: `净重不一致, 系统上为${formMass}g, 概要上为${summaryMassNumber}g`,
      },
    ]
  }
  return []
}

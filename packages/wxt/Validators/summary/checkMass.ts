import { CheckResult } from "../shared/types/index"
import { matchBatteryWeight } from "../shared/utils/index"

export function checkMass(formMass: number, summaryMass: string): CheckResult[] {
  let summaryMassNumber = matchBatteryWeight("为" + summaryMass.trim())
  if (summaryMassNumber !== formMass) {
    return [{
      ok: false,
      result: `净重不一致, 系统上为${formMass}g, 概要上为${summaryMassNumber}g`
    }]
  }
  return []
}
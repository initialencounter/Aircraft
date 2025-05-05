import { CheckResult } from "../shared/types/index"
import { matchVoltage } from "../shared/utils/index"

export function checkVoltage(formVoltage: number, summaryVoltage: string): CheckResult[] {
  let summaryVoltageNumber = matchVoltage(summaryVoltage.trim())
  if (summaryVoltageNumber !== formVoltage) {
    return [{
      ok: false,
      result: `电压不一致, 系统上为${formVoltage}, 概要上为${summaryVoltageNumber}`
    }]
  }
  return []
} 
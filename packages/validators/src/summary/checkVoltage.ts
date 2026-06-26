import type { CheckResult } from '../lithium/shared/types'
import { matchVoltage } from '../lithium/shared/utils'

export function checkVoltage(
  formVoltage: number,
  summaryVoltage: string
): CheckResult[] {
  const summaryVoltageNumber = matchVoltage(summaryVoltage.trim())
  if (summaryVoltageNumber !== formVoltage) {
    return [
      {
        ok: false,
        result: `电压不一致, 系统上为${formVoltage}, 概要上为${summaryVoltageNumber}`,
      },
    ]
  }
  return []
}

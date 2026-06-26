import type { CheckResult } from '../lithium/shared/types'

export function checkModel(
  formModel: string,
  summaryModel: string
): CheckResult[] {
  if (formModel.trim() !== summaryModel.trim()) {
    return [
      {
        ok: false,
        result: `型号不一致, 系统上为${formModel}, 概要上为${summaryModel}`,
      },
    ]
  }
  return []
}

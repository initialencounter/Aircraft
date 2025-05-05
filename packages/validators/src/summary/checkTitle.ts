import type { CheckResult } from '../shared/types'

export function checkTitle(summaryTitle: string): CheckResult[] {
  if (summaryTitle.trim() !== '锂电池/钠离子电池UN38.3试验概要Test Summary') {
    return [
      {
        ok: false,
        result: `概要标题${summaryTitle}不正确`,
      },
    ]
  }
  return []
}

import type { CheckResult } from '../shared/types'

export function checkTradeMark(
  formTradeMark: string,
  summaryTradeMark: string
): CheckResult[] {
  const formTradeMarkText = formTradeMark.trim()
  const summaryTradeMarkText = summaryTradeMark.trim()
  if (!formTradeMarkText || summaryTradeMarkText === '/') return []
  if (formTradeMarkText !== summaryTradeMarkText) {
    return [
      {
        ok: false,
        result: `商标不一致, 系统上为${formTradeMarkText}, 概要上为${summaryTradeMarkText}`,
      },
    ]
  }
  return []
}

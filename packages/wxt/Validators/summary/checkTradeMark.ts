import { CheckResult } from "../shared/types/index"

export function checkTradeMark(formTradeMark: string, summaryTradeMark: string): CheckResult[] {
  let formTradeMarkText = formTradeMark.trim()
  let summaryTradeMarkText = summaryTradeMark.trim()
  if (!formTradeMarkText || summaryTradeMarkText === '/') return []
  if (formTradeMarkText !== summaryTradeMarkText) {
    return [{
      ok: false,
      result: `商标不一致, 系统上为${formTradeMarkText}, 概要上为${summaryTradeMarkText}`
    }]
  }
  return []
}
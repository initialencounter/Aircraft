import type { CheckResult, SekBtyType } from '../lithium/shared/types'
import { batteryTypeMap } from './checkBatteryType'


export function checkT7(
  batteryType: SekBtyType,
  summaryTest7: string,
  note: string
): CheckResult[] {
  switch (batteryType) {
    case '501':
    case '502':
    case '503':
    case '601':
      if (summaryTest7.includes('通过')) {
        return [
          {
            ok: false,
            result: `电池类型为${batteryTypeMap[batteryType]}, 概要T7测试结果为${summaryTest7}`,
          },
        ]
      }
      break
    case '500':
    case '600':
      if (summaryTest7.includes('不适用') && !note.includes('保护')) {
        return [
          {
            ok: false,
            result: `电池类型为${batteryTypeMap[batteryType]}，不含保护电路，概要T7测试结果为${summaryTest7}`,
          },
        ]
      }
      break
    case '504':
    case '602':
      if (summaryTest7.includes('不适用')) {
        return [
          {
            ok: false,
            result: `电池类型为${batteryTypeMap[batteryType]}，概要T7测试结果为${summaryTest7}`,
          },
        ]
      }
      break
  }
  return []
}

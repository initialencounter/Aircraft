import { CheckResult, SekBtyType } from "../shared/types/index"

const batteryTypeMap = {
  '500': '锂离子电池',
  '501': '锂离子电芯',
  '502': '锂金属电池',
  '503': '锂金属电芯',
  '504': '单芯锂离子电池',
  '505': '单芯锂金属电池'
}

export function checkT7(batteryType: SekBtyType, summaryTest7: string, note: string): CheckResult[] {
  switch (batteryType) {
    case '501':
    case '502':
    case '503':
      if (summaryTest7.includes('通过')) {
        return [{
          ok: false,
          result: `电池类型为${batteryTypeMap[batteryType]}, 概要T7测试结果为${summaryTest7}`
        }]
      }
      break
    case '500':
      if (summaryTest7.includes('不适用') && !note.includes('保护')) {
        return [{
          ok: false,
          result: `电池类型为${batteryTypeMap[batteryType]}，不含保护电路，概要T7测试结果为${summaryTest7}`
        }]
      }
      break
    case '504':
      if (summaryTest7.includes('不适用')) {
        return [{
          ok: false,
          result: `电池类型为${batteryTypeMap[batteryType]}，概要T7测试结果为${summaryTest7}`
        }]
      }
      break
  }
  return []
}
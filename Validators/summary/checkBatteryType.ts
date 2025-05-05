import { CheckResult, SekBtyType } from "../shared/types/index"

const batteryTypeMap = {
  '500': '锂离子电池',
  '501': '锂离子电芯',
  '502': '锂金属电池',
  '503': '锂金属电芯',
  '504': '单电芯锂离子电池',
  '505': '单电芯锂金属电池'
}


export function matchBatteryType(summaryBatteryType: string): SekBtyType | '' {
  if (summaryBatteryType.includes('单电芯锂离子电池')) return '504'
  if (summaryBatteryType.includes('单电芯锂金属电池')) return '505'
  if (summaryBatteryType.includes('锂离子电芯')) return '501'
  if (summaryBatteryType.includes('锂金属电池')) return '502'
  if (summaryBatteryType.includes('锂金属电芯')) return '503'
  if (summaryBatteryType.includes('锂离子电池')) return '500'
  return ''
}

export function checkBatteryType(formBatteryType: SekBtyType, summaryBatteryType: string): CheckResult[] {
  let summaryBatteryTypeCode = matchBatteryType(summaryBatteryType.trim())
  if (summaryBatteryTypeCode === '') return []
  if (formBatteryType !== summaryBatteryTypeCode) {
    return [{
      ok: false,
      result: `电池类型不一致, 系统上为${batteryTypeMap[formBatteryType]}, 概要上为${summaryBatteryType}`
    }]
  }
  return []
}
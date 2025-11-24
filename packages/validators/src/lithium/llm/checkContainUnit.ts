import type { SummaryFromLLM, SummaryInfo } from '../shared/types'
import type { CheckResult } from '../shared/types'
import {
  matchBatteryWeight,
  matchCapacity,
  matchVoltage,
  matchWattHour,
} from '../shared/utils'

const containUnitItem = ['voltage', 'capacity', 'watt', 'mass', 'licontent']
const units = ['V', 'mAh', 'Wh', 'g', 'g']
const numberMatcher = [
  matchVoltage,
  matchCapacity,
  matchWattHour,
  matchBatteryWeight,
  matchBatteryWeight,
]

export function checkContainUnit(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryInfo
): CheckResult[] {
  const results: CheckResult[] = []
  for (let i = 0; i < containUnitItem.length; i++) {
    const item = containUnitItem[i]
    if (!item) continue
    const valueFromLLM = Number(summaryFromLLM[item as keyof SummaryFromLLM])
    let valueFromInfo = String(summaryInfo[item as keyof SummaryInfo]).trim()
    const unit = units[i]
    if (valueFromInfo.includes('不适用')) {
      continue
    }
    if (!valueFromInfo.replace('/', '').length) {
      continue
    }
    if (['mass', 'licontent'].includes(item)) {
      valueFromInfo = '为' + valueFromInfo
    }
    if (item === 'watt') {
      valueFromInfo = ' ' + valueFromInfo
    }
    const matcher = numberMatcher[i]
    if (!matcher) continue
    const valueFromInfoNumber = matcher(valueFromInfo)
    if (valueFromInfoNumber !== valueFromLLM) {
      results.push({
        ok: false,
        result: `UN报告上的${item}为 ${valueFromLLM}${unit}，概要中为 ${valueFromInfoNumber}${unit}`,
      })
    }
  }
  return results
}

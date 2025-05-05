import { SummaryFromLLM, SummaryInfo } from "../shared/types/attachment";
import { CheckResult } from "../shared/types/index";
import { matchBatteryWeight, matchCapacity, matchVoltage, matchWattHour } from "../shared/utils/index";

const containUnitItem = ["voltage", "capacity", "watt", "mass", "licontent"]
const units = ["V", "mAh", "Wh", "g", "g"]
const numberMatcher = [matchVoltage, matchCapacity, matchWattHour, matchBatteryWeight, matchBatteryWeight]

export function checkContainUnit(summaryFromLLM: SummaryFromLLM, summaryInfo: SummaryInfo): CheckResult[] {
  let results: CheckResult[] = []
  for (let i = 0; i < containUnitItem.length; i++) {
    let item = containUnitItem[i]
    let valueFromLLM = Number(summaryFromLLM[item as keyof SummaryFromLLM])
    let valueFromInfo = String(summaryInfo[item as keyof SummaryInfo]).trim()
    let unit = units[i]
    if (valueFromInfo.includes("不适用")) {
      continue
    }
    if (!valueFromInfo.replace('/', '').length) {
      continue
    }
    if (["mass", "licontent"].includes(item)) {
      valueFromInfo = "为" + valueFromInfo
    }
    if (item === "watt") {
      valueFromInfo = ' ' + valueFromInfo
    }
    let valueFromInfoNumber = numberMatcher[i](valueFromInfo)
    if (valueFromInfoNumber !== valueFromLLM) {
      results.push({
        ok: false,
        result: `UN报告上的${item}为 ${valueFromLLM}${unit}，概要中为 ${valueFromInfoNumber}${unit}`
      })
    }
  }
  return results
}
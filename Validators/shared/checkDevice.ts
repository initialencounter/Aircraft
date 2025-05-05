import { CheckResult } from "./types/index"
import { matchDeviceName, matchDeviceModel, matchDeviceTrademark } from "./utils/index"

export function checkDevice(cName: string, eName: string, otherDescribeCAddition: string): CheckResult[] {
  let results: CheckResult[] = []
  const name = matchDeviceName(otherDescribeCAddition).trim()
  const model = matchDeviceModel(otherDescribeCAddition).trim()
  const trademark = matchDeviceTrademark(otherDescribeCAddition).trim()

  if (name.length && !cName.includes(name)) {
    results.push({
      ok: false,
      result: `中文品名中不存在设备名称: ${name}`
    })
  }

  if (model.length) {
    if (!cName.includes(model)) {
      results.push({
        ok: false,
        result: `中文品名中不存在设备型号：${model}`
      })
    }
    if (!eName.includes(model)) {
      results.push({
        ok: false,
        result: `英文品名中不存在设备型号: ${model}`
      })
    }
  }

  // if (trademark.length && !cName.includes(trademark)) {
  //   results.push({
  //     ok: false,
  //     result: `设备商标不匹配: ${cName} 和 ${trademark}`
  //   })
  // }

  return results
}


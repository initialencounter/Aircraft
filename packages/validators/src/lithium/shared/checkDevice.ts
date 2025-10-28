import type { CheckResult } from './types'
import { matchDeviceModel, matchDeviceName } from './utils'

export function checkDevice(
  cName: string,
  eName: string,
  otherDescribeCAddition: string
): CheckResult[] {
  const results: CheckResult[] = []
  const name = matchDeviceName(otherDescribeCAddition).trim()
  const model = matchDeviceModel(otherDescribeCAddition).trim()

  if (name.length && !cName.includes(name)) {
    results.push({
      ok: false,
      result: `中文品名中不存在设备名称: ${name}`,
    })
  }

  if (model.length) {
    if (!cName.includes(model)) {
      results.push({
        ok: false,
        result: `中文品名中不存在设备型号：${model}`,
      })
    }
    if (!eName.includes(model)) {
      results.push({
        ok: false,
        result: `英文品名中不存在设备型号: ${model}`,
      })
    }
  }
  return results
}

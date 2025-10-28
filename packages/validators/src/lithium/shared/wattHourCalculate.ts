import type { CheckResult } from './types'

/**
 * 瓦时数计算
 * @param capacity 容量
 * @param voltage 电压
 * @param wattHour 瓦时数
 * @param wattHourFromName 瓦时数从名称中获取
 * @returns
 */
export function wattHourCalculate(
  capacity: number,
  voltage: number,
  wattHour: number,
  wattHourFromName: number
): CheckResult[] {
  if (capacity && voltage && wattHour && wattHourFromName === wattHour) {
    const expectedWattHour = (capacity * voltage) / 1000
    const abs = Math.abs((expectedWattHour - wattHour) / wattHour)
    if (abs > 0.05) {
      return [{ ok: false, result: '容量*电压 与 瓦时数 误差大于5%' }]
    }
  }
  return []
}

import { CheckResult } from './types'

const MAX_ENERGY_DENSITY = 0.32 // 假设最大能量密度为0.32 Wh/g


export function checkEnergyDensity(wattHour: number, mass: number): CheckResult[] {
  const results: CheckResult[] = []
  if (!wattHour || !mass) {
    return results // 如果瓦时数或质量为0，直接返回空结果
  }
  const density = wattHour / mass // 计算能量密度
  if (density > MAX_ENERGY_DENSITY) {
    results.push({
      ok: false,
      result: '电池能量密度大于320Wh/kg，请确认电池参数是否正确',
    })
  }

  return results
}
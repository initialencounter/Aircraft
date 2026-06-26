import type { CheckResult } from './types'

/**
 * 电压与电池类型检测
 * @param voltage 电压
 * @param btyType 电池类型
 * @returns
 */
export function voltageBtyType(
  voltage: number,
  btyType: string
): CheckResult[] {
  // 电压大于7V，可能为电池组
  if (voltage > 7 && (btyType === '503' || btyType === '501')) {
    return [{ ok: false, result: '电压大于7V，可能为电池组' }]
  }
  return []
}

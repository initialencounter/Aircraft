import type { CheckResult } from './types'

/**
 * 电池尺寸单位检测
 * @param btySize 电池尺寸
 * @returns
 */
export function btySizeUnit(btySize: string): CheckResult[] {
  if (btySize.replace(/ /g, '').length > 0) {
    if (!btySize.includes('m') && !btySize.includes('M'))
      return [{ ok: false, result: '电池尺寸缺失单位' }]
  }
  return []
}

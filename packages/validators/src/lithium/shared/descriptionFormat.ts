import type { CheckResult } from './types'

export function descriptionFormat(otherDescribeCAddition: string): CheckResult[] {
  if (otherDescribeCAddition.includes('gg。')) {
    return [{
      ok: false,
      result: '电池质量单位中存在两个g'
    }]
  }
  if (!otherDescribeCAddition.includes('g。')) {
    return [{
      ok: false,
      result: '电池质量单位中缺少g'
    }]
  }
  return [];
}
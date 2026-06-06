import type { CheckResult } from './types'

export function descriptionFormat(otherDescribeCAddition: string, selector: string): CheckResult[] {
  if (otherDescribeCAddition.includes('gg。') || otherDescribeCAddition.includes('gg，')) {
    return [{
      ok: false,
      result: '电池质量单位中存在两个g',
      selector,
    }]
  }
  if (!otherDescribeCAddition.includes('g。') && !otherDescribeCAddition.includes('g，')) {
    return [{
      ok: false,
      result: '电池质量单位中缺少g',
      selector,
    }]
  }
  return [];
}
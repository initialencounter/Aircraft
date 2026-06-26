import type { CheckResult } from '../shared/types'

/**
 * 其他描述检测
 * @param isCell 是否为电芯
 * @param otherDescribe 其他描述
 * @returns
 */
export function otherDescribeIsCell(
  isCell: boolean,
  otherDescribe: string
): CheckResult[] {
  const result: CheckResult[] = []
  if (isCell) {
    // 1791,1794
    if (otherDescribe.includes('1791') || otherDescribe.includes('1794')) {
      result.push({
        ok: false,
        result:
          '物品为电芯，不应勾选: 该电池已经做好防短路...或该锂电池不属于召回电芯...',
      })
    }
  } else {
    // 1792,1795
    if (otherDescribe.includes('1792') || otherDescribe.includes('1795')) {
      result.push({
        ok: false,
        result:
          '物品为电池，不应勾选: 该电芯已经做好防短路...或该锂电芯不属于召回电芯...',
      })
    }
  }
  return result
}

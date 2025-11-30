import type { CheckResult } from '../lithium/shared/types'

export function checkManufacturer(
  systemIdManufacturer: string,
  summaryManufacturer: string
): CheckResult[] {
  systemIdManufacturer = systemIdManufacturer.replace(/\s?\(/g, '（').replace(/\(\s?/g, '）')
  summaryManufacturer = summaryManufacturer.replace(/\s?\(/g, '（').replace(/\(\s?/g, '）')
  if (!systemIdManufacturer) {
    return [{ ok: false, result: '获取系统制造商失败' }]
  }
  if (!summaryManufacturer.includes(systemIdManufacturer.trim())) {
    return [
      {
        ok: false,
        result: `制造商不一致, 系统上制造商为${systemIdManufacturer.trim()}, 概要制造商为${summaryManufacturer}`,
      },
    ]
  }
  return []
}

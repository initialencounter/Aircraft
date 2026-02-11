import type { CheckResult } from '../lithium/shared/types'

export function checkConsignor(
  systemIdConsignor: string | undefined,
  summaryConsignor: string
): CheckResult[] {
  if (!systemIdConsignor) {
    return [{ ok: false, result: '获取系统委托方失败, 无法验证概要委托方' }]
  }
  systemIdConsignor = systemIdConsignor.replace(/\s?\(/g, '（').replace(/\(\s?/g, '）')
  summaryConsignor = summaryConsignor.replace(/\s?\(/g, '（').replace(/\(\s?/g, '）')
  if (!summaryConsignor.includes(systemIdConsignor.trim())) {
    return [
      {
        ok: false,
        result: `委托方不一致, 系统上委托方为${systemIdConsignor.trim()}, 概要委托方为${summaryConsignor}`,
      },
    ]
  }
  return []
}

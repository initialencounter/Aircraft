import type { CheckResult } from '../lithium/shared/types'

export function checkT8(
  isSodium: boolean,
  summaryTest8: string,
): CheckResult[] {
  if (isSodium) {
    if (summaryTest8.includes('通过')) {
      return [
        {
          ok: false,
          result: `钠离子电池, 概要T8测试结果应为不适用`,
        },
      ]
    }
  } else {
    if (!summaryTest8.includes('通过')) {
      return [
        {
          ok: false,
          result: `非钠离子电池, 概要T8测试结果应为通过`,
        },
      ]
    }
  }
  return []
}

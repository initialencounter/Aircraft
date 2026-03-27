import type { CheckResult } from '../lithium/shared/types'

export function checkTestDate(
  test_date: string,
): CheckResult[] {
  // 解析输入的日期
  if(test_date === null) {
    return []
  }
  const inputDate = new Date(test_date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const diffTime = inputDate.getTime() - today.getTime()

  const result: CheckResult[] = []
  if (diffTime > 0) {
    result.push({
      ok: false,
      result: '签发日期晚于今天',
    })
  }
  return result
}

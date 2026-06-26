import type { CheckResult } from '../lithium/shared/types'

export function checkProjectNo(
  formProjectNo: string,
  summaryProjectNo: string
): CheckResult[] {
  if (formProjectNo !== summaryProjectNo.trim()) {
    return [{ ok: false, result: '概要项目编号不一致' }]
  }
  return []
}

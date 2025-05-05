import { CheckResult } from "../shared/types/index"

export function checkProjectNo(formProjectNo: string, summaryProjectNo: string): CheckResult[] {
  if (formProjectNo !== summaryProjectNo.trim()) {
    return [{ ok: false, result: '项目编号不一致' }]
  }
  return []
}
import type { CheckResult } from '../../shared/types'

export function checkProjectNo(
  currentDataProjectNo: string,
  goodsInfoProjectNo: string
): CheckResult[] {
  if (currentDataProjectNo !== goodsInfoProjectNo) {
    return [
      {
        ok: false,
        result: '图片项目号不一致',
      },
    ]
  }
  return []
}

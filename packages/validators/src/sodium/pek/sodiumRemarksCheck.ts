import { CheckResult } from '../../lithium/shared/types'
import type { SodiumPkgInfoSubType } from '../shared/types'

// 1518 本物品仅限货机运输.
// 1401 包装必须达到II级包装的性能标准
// 1435 电池或电芯必须加以保护,防止短路.设备必须采取措施防止意外启动.
// 1402 每一单电池必须做好防短路措施，并装入坚固外包装内。
export function sodiumRemarksCheck(
  remarks: string,
  pkgInfoSubType: SodiumPkgInfoSubType
): CheckResult[] {
  switch (pkgInfoSubType) {
    case '952':
    case '978, I':
    case '978, II':
      if (remarks !== '1435') {
        return [
          {
            ok: false,
            result:
              '注意事项错误，应为：电池或电芯必须加以保护,防止短路.设备必须采取措施防止意外启动.',
          },
        ]
      }
      break
    case '977, II':
      if (remarks !== '1402') {
        return [
          {
            ok: false,
            result:
              '注意事项错误，应为：每一单电池必须做好防短路措施，并装入坚固外包装内。',
          },
        ]
      }
      break
    case '976':
    case '977, I':
      if (remarks !== '1401') {
        return [
          {
            ok: false,
            result: '注意事项错误，应为：包装必须达到II级包装的性能标准',
          },
        ]
      }
      break
  }
  return []
}

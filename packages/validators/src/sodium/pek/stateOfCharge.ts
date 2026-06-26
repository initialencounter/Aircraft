import { CheckResult } from '../../lithium/shared/types'
import { PekSodiumPkgInfo } from '../shared/types'


/**
 * 荷电状态检测
 * @param pkgInfo 包装说明，不含IA,IB
 * @param otherDescribe 其他描述
 * @returns
 */
export function pekSodiumStateOfCharge(
  pkgInfo: PekSodiumPkgInfo,
  otherDescribe: string
): CheckResult[] {
  const result: CheckResult[] = []
  // 荷电状态≤30%
  if (
    pkgInfo === '976' &&
    !otherDescribe.includes('2797')
  ) {
    result.push({ ok: false, result: '976 应勾选: 荷电状态≤30%' })
  }
  return result
}

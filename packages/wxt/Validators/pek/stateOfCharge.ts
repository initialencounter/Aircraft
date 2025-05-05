import { CheckResult } from "../shared/types/index";

/**
 * 荷电状态检测
 * @param pkgInfo 包装说明，不含IA,IB
 * @param otherDescribe 其他描述
 * @returns 
 */
export function stateOfCharge(pkgInfo: string, otherDescribe: string): CheckResult[] {
  let result: CheckResult[] = []
  // 荷电状态≤30%
  if (pkgInfo === '965' && !otherDescribe.includes('8aad92b65887a3a8015889d0cd7d0093')) {
    result.push({ ok: false, result: '965 应勾选: 荷电状态≤30%' })
  }
  if (pkgInfo !== '965' && otherDescribe.includes('8aad92b65887a3a8015889d0cd7d0093')) {
    result.push({ ok: false, result: '非 965 不应勾选: 荷电状态≤30%' })
  }
  return result
}

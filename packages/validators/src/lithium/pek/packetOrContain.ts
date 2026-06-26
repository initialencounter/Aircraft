import type { CheckResult } from '../shared/types'

/**
 * 包装或包含检测
 * @param pkgInfo 包装说明，不含IA,IB
 * @param pkgInfoByPackCargo 包装说明，含IA,IB，检验单展示的数据
 * @param otherDescribeCAddition 其他描述
 * @param isChargeBoxOrRelated 是否为充电盒或关联报告
 * @returns
 */
export function packetOrContain(
  pkgInfo: string,
  pkgInfoByPackCargo: string,
  otherDescribeCAddition: string,
  isChargeBoxOrRelated: boolean
): CheckResult[] {
  const result: CheckResult[] = []
  if (pkgInfo !== pkgInfoByPackCargo) {
    result.push({
      ok: false,
      result: `${pkgInfo}包装，但结论是${pkgInfoByPackCargo}`,
    })
  }
  if (
    (pkgInfo === '966' || pkgInfo === '969' || pkgInfo === '977' ) &&
    !otherDescribeCAddition.includes('包装在一起') &&
    !isChargeBoxOrRelated
  )
    result.push({
      ok: false,
      result: '与设备包装在一起，其他描述中没有包装在一起5个字',
    })
  if (
    (pkgInfo === '967' || pkgInfo === '970' || pkgInfo === '978') &&
    !otherDescribeCAddition.includes('设备内置') &&
    !isChargeBoxOrRelated
  )
    result.push({
      ok: false,
      result: '安装在设备上，其他描述中没有设备内置4个字',
    })
  return result
}

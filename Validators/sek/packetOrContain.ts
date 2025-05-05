import { CheckResult } from "../shared/types/index";

/**
 * 包装或包含检测
 * @param otherDescribe 其他描述
 * @param otherDescribeCAddition 其他描述补充
 * @param isChargeBoxOrRelated 是否为充电盒或关联报告
 * @returns 
 */
export function packetOrContain(otherDescribe: string, otherDescribeCAddition: string, isChargeBoxOrRelated: boolean): CheckResult[] {
  let result: CheckResult[] = []
  // 包装与其他描述验证
  if (
    otherDescribe === '541' &&
    !otherDescribeCAddition.includes('包装') &&
    !isChargeBoxOrRelated
  )
    result.push({ ok: false, result: '与设备包装在一起，其他描述错误' })
  if (
    otherDescribe === '542' &&
    !otherDescribeCAddition.includes('设备内置') &&
    !isChargeBoxOrRelated
  )
    result.push({ ok: false, result: '安装在设备上，其他描述错误' })
  return result
}

import type { CheckResult, PkgInfoSubType } from '../shared/types'

/**
 * 荷电状态检测
 * @param pkgInfo 包装说明，不含IA,IB
 * @param otherDescribe 其他描述
 * @returns
 */
export function stateOfCharge(
  pkgInfoSubType: PkgInfoSubType,
  otherDescribe: string,
  wattHour: number,
  unno: string,
  projectYear?: string,
): CheckResult[] {
  const result: CheckResult[] = []
  // 荷电状态≤30%
  const socCapacity = otherDescribe.includes('8aad92b65887a3a8015889d0cd7d0093')
  const deviceBatteryCapacity = otherDescribe.includes('2c9180849a150aee019a47e5345f3e5e')
  if (socCapacity && deviceBatteryCapacity) {
    result.push({ ok: false, result: `同时勾选SoC荷电状态≤30%和设备显示电量≤25%` })
  }
  switch (pkgInfoSubType) {
    case '965, IA':
    case '965, IB':
      if (!socCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}应为SoC荷电状态≤30%` })
      }
      break;
    case '966, I':
      if (projectYear === undefined && !socCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}应为SoC荷电状态≤30%，如果是25年报告请忽略` })
        break;
      }
      if (!socCapacity && projectYear === '2026') {
        result.push({ ok: false, result: `${projectYear}年报告，${pkgInfoSubType}应为SoC荷电状态≤30%` })
      }
      break;
    case '966, II':
      if (projectYear === undefined && wattHour > 2.7 && !socCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}瓦时＞2.7，应为SoC荷电状态≤30%，如果是25年报告请忽略` })
        break;
      }
      if (projectYear === '2026' && wattHour > 2.7 && !socCapacity) {
        result.push({ ok: false, result: `${projectYear}年报告，瓦时＞2.7，${pkgInfoSubType}应为SoC荷电状态≤30%` })
      }
      break;
    case '952':
      if (projectYear === undefined && unno === 'UN3556' && wattHour > 100 && !deviceBatteryCapacity && !socCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}，UN3556 瓦时>100， 应勾选显示电量≤25%或SoC荷电状态≤30%，如果是25年报告请忽略` })
        break;
      }
      if (projectYear === '2026' && !deviceBatteryCapacity && !socCapacity && unno === 'UN3556' && wattHour > 100) {
        result.push({ ok: false, result: `${projectYear}年报告，UN3556 瓦时>100，${pkgInfoSubType}应勾选显示电量≤25%或SoC荷电状态≤30%` })
      }
      break;
    default:
      if (socCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选荷电状态≤30%` })
      }
      if (deviceBatteryCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}不应勾选设备显示电量≤25%` })
      }
  }

  return result
}

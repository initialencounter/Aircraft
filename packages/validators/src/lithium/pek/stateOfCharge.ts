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
  // SoC荷电状态≤30%
  const socCapacity = otherDescribe.includes('8aad92b65887a3a8015889d0cd7d0093')
  const deviceBatteryCapacity = otherDescribe.includes('2c9180849a150aee019a47e5345f3e5e')
  // 设备显示电量≤25%
  if (socCapacity && deviceBatteryCapacity) {
    result.push({ ok: false, result: `同时勾选SoC荷电状态≤30%和设备显示电量≤25%` })
  }
  const onlySelectSocCapacity = socCapacity && !deviceBatteryCapacity;
  const onlySelectDeviceBatteryCapacity = deviceBatteryCapacity && !socCapacity;
  const neitherSelect = !deviceBatteryCapacity && !socCapacity;

  switch (pkgInfoSubType) {
    case '965, IA':
    case '965, IB':
      if (!onlySelectSocCapacity) {
        result.push({ ok: false, result: `${pkgInfoSubType}只勾选SoC荷电状态≤30%` })
      }
      break;
    case '966, I':
      switch (projectYear) {
        case undefined:
          if (!onlySelectSocCapacity) {
            result.push({ ok: false, result: `${projectYear}年报告，${pkgInfoSubType}只勾选SoC荷电状态≤30%，如果是25年报告请忽略` })
          }
          break;
        case '2026':
          if (!onlySelectSocCapacity) {
            result.push({ ok: false, result: `${projectYear}年报告，${pkgInfoSubType}只勾选SoC荷电状态≤30%` })
          }
          break;
        default:
          if (!neitherSelect) {
            result.push({ ok: false, result: `${projectYear}年报告,${pkgInfoSubType}“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选` })
          }
      }
      break;
    case '966, II':
      switch (projectYear) {
        case undefined:
          if (wattHour > 2.7) {
            if (!onlySelectSocCapacity) {
              result.push({ ok: false, result: `${pkgInfoSubType}瓦时＞2.7，只勾选SoC荷电状态≤30%，如果是25年报告请忽略` })
            }
          } else {
            if (!neitherSelect) {
              result.push({ ok: false, result: `${pkgInfoSubType}瓦时≤2.7，“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选，如果是25年报告请忽略` })
            }
          }
          break;
        case '2026':
          if (wattHour > 2.7) {
            if (!onlySelectSocCapacity) {
              result.push({ ok: false, result: `${projectYear}年报告，瓦时＞2.7，${pkgInfoSubType}只勾选SoC荷电状态≤30%` })
            }
          } else {
            if (!neitherSelect) {
              result.push({ ok: false, result: `${projectYear}年报告，瓦时≤2.7，${pkgInfoSubType}“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选` })
            }
          }
          break;
        default:
          if (!neitherSelect) {
            result.push({ ok: false, result: `${projectYear}年报告,${pkgInfoSubType}“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选` })
          }
          break;
      }
      break;
    case '952':
      if (unno === 'UN3556') {
        switch (projectYear) {
          case undefined:
            if (wattHour > 100) {
              if (!onlySelectDeviceBatteryCapacity && !deviceBatteryCapacity) {
                result.push({ ok: false, result: `${pkgInfoSubType} ${unno} 瓦时>100，未勾选“SoC荷电状态≤30%”或“设备显示电量≤25%”，如果是25年报告请忽略` })
              }
            }
            break;
          case '2026':
            if (wattHour > 100) {
              if (!onlySelectDeviceBatteryCapacity && !deviceBatteryCapacity) {
                result.push({ ok: false, result: `${projectYear}年报告，${pkgInfoSubType} ${unno} 瓦时>100，未勾选“SoC荷电状态≤30%”或“设备显示电量≤25%”` })
              }
            }
            break;
          default:
            if (!neitherSelect) {
              result.push({ ok: false, result: `${projectYear}年报告,${pkgInfoSubType} ${unno}“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选` })
            }
        }
      } else {
        if (!neitherSelect) {
          result.push({ ok: false, result: `${pkgInfoSubType} ${unno}“SoC荷电状态≤30%”和“设备显示电量≤25%”都不应勾选` })
        }
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

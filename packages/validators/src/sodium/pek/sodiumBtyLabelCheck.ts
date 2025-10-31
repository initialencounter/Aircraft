import { isBatteryLabel } from "../../lithium/shared/utils"
import { CheckResult } from "../../lithium/shared/types"
import { SodiumPkgInfoSubType } from "../shared/types"

/**
 * 锂电池标签检测
 * 设备内置纽扣电池不应加贴锂电池标签
 * 965, 968 应加贴锂电池标签
 * @param pkgInfoSubType 包装说明，含IA,IB
 * @param btyShape 电池形状
 * @param liBtyLabel 是否加贴锂电池标签
 * @returns
 */
export function sodiumBtyLabelCheck(
  pkgInfoSubType: SodiumPkgInfoSubType,
  btyShape: string,
  btyLabel: boolean
): CheckResult[] {
  const result: CheckResult[] = []
  if (isBatteryLabel(pkgInfoSubType, btyShape)) {
    if (!btyLabel)
      if (pkgInfoSubType === '978, II')
        result.push({
          ok: false,
          result: `检验项目5错误，978, II，非纽扣电池，应勾选加贴电池标记`,
        })
      else
        result.push({
          ok: false,
          result: `检验项目5错误，${pkgInfoSubType}应勾选加贴电池标记`,
        })
  } else {
    if (btyLabel)
      if (
        pkgInfoSubType === '978, II' &&
        btyShape === '8aad92b65aae82c3015ab094788a0026'
      )
        result.push({
          ok: false,
          result: `检验项目5错误，设备内置纽扣电池不应勾选加贴电池标记`,
        })
      else
        result.push({
          ok: false,
          result: `检验项目5错误，${pkgInfoSubType}不应勾选加贴电池标记`,
        })
  }
  return result
}

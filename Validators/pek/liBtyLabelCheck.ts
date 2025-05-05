import { isBatteryLabel } from "../shared/utils/index"
import { CheckResult, PkgInfoSubType } from "../shared/types/index"

/**
 * 锂电池标签检测
 * 设备内置纽扣电池不应加贴锂电池标签
 * 965, 968 应加贴锂电池标签
 * @param pkgInfoSubType 包装说明，含IA,IB
 * @param btyShape 电池形状
 * @param liBtyLabel 是否加贴锂电池标签
 * @returns 
 */
export function liBtyLabelCheck(pkgInfoSubType: PkgInfoSubType, btyShape: string, liBtyLabel: boolean): CheckResult[] {
  let result: CheckResult[] = []
  if (isBatteryLabel(pkgInfoSubType, btyShape)) {
    if (!liBtyLabel)
      if (pkgInfoSubType === '970, II')
        result.push({ ok: false, result: `检验项目5错误，970, II，非纽扣电池，应勾选加贴锂电池标记` })
      else
        result.push({ ok: false, result: `检验项目5错误，${pkgInfoSubType}应勾选加贴锂电池标记` })
  } else {
    if (liBtyLabel)
      if (pkgInfoSubType === '970, II' && btyShape === '8aad92b65aae82c3015ab094788a0026')
        result.push({ ok: false, result: `检验项目5错误，设备内置纽扣电池不应勾选加贴锂电池标记` })
      else
        result.push({ ok: false, result: `检验项目5错误，${pkgInfoSubType}不应勾选加贴锂电池标记` })
  }
  return result
}

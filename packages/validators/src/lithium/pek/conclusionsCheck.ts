import type { CheckResult, PekPkgInfo } from '../shared/types'
import { getIsCargoOnly } from '../shared/utils'
import { getUNNO } from '../shared/utils'
import { properShippingNameMap } from '../shared/consts/properShippingNameMap'

type UnnoKey = keyof typeof properShippingNameMap
/**
 * 结论检测
 * @param conclusions 结论
 * @param isDangerous 是否为危险品
 * @param pkgInfoByPackCargo 包装说明，含IA,IB，检验单展示的数据
 * @param pkgInfo 包装说明，不含IA,IB
 * @param unno UN编号
 * @param netWeight 净重
 * @param packPassengerCargo 客货机
 * @param classOrDiv 危险性类别
 * @param pkgInfoReference 参见包装说明
 * @param isIon 是否为锂电池
 * @param packCargo 仅限货机
 * @param inspectionItem1
 * @param properShippingName
 * @param packageGrade
 * @returns
 */
export function conclusionsCheck(
  conclusions: number,
  isDangerous: boolean,
  pkgInfoByPackCargo: PekPkgInfo,
  pkgInfo: PekPkgInfo,
  unno: string,
  netWeight: number,
  packPassengerCargo: string,
  classOrDiv: string,
  pkgInfoReference: string,
  isIon: boolean,
  packCargo: string,
  inspectionItem1: '0' | '1' | '2', // 0 965 1 966 2 967
  properShippingName: string,
  packageGrade: string
): CheckResult[] {
  properShippingName = properShippingName.trim()
  packageGrade = packageGrade.trim()
  classOrDiv = classOrDiv.trim()
  const result: CheckResult[] = []
  // 危险品
  if (conclusions === 1) {
    let unKey: UnnoKey = unno as UnnoKey
    if (unno === 'UN3481' || unno === 'UN3091') {
      // 内置
      if (inspectionItem1 === '2') {
        unKey = (unno + '-C') as UnnoKey
      } else if (inspectionItem1 === '1') {
        // 包装
        unKey = (unno + '-P') as UnnoKey
      }
    }
    if (properShippingNameMap[unKey] !== properShippingName) {
      result.push({
        ok: false,
        result: `运输专有名称错误，应为${properShippingNameMap[unKey]}`,
      })
    }
    if (!isDangerous) {
      result.push({
        ok: false,
        result:
          '结论错误，经包装、电池瓦时、锂含量、净重、电芯类型判断，物品为非限制性货物',
      })
    }
    const UNNO = getUNNO(pkgInfoByPackCargo, isIon)
    const isCargoOnly = getIsCargoOnly(pkgInfo, netWeight)
    if (isCargoOnly) {
      if (packPassengerCargo !== 'Forbidden')
        result.push({ ok: false, result: '结论错误，客货机禁止运输' })
    } else {
      if (packPassengerCargo === 'Forbidden')
        result.push({ ok: false, result: '结论错误，客货机不应为 Forbidden' })
    }
    if (unno !== UNNO) {
      result.push({ ok: false, result: '结论错误，UN编号应为' + UNNO })
    }
    if (String(classOrDiv) !== '9') {
      result.push({ ok: false, result: '结论错误，危险性类别应为9' })
    }
    if (pkgInfoReference !== '') {
      result.push({ ok: false, result: '结论错误，危险品，参见包装说明应为空' })
    }
    if (packageGrade !== '/') {
      result.push({ ok: false, result: '结论错误，危险品，包装等级应为斜杠' })
    }
  } else if (conclusions === 0) {
    if (isDangerous) {
      result.push({
        ok: false,
        result:
          '结论错误，经包装、电池瓦时、锂含量、净重、电芯类型判断，物品为危险品',
      })
    }
    // 非限制性
    if (packCargo !== '') {
      result.push({ ok: false, result: '结论错误，仅限货机应为空' })
    }
    if (packPassengerCargo !== '') {
      result.push({ ok: false, result: '结论错误，客货机应为空' })
    }
    if (classOrDiv !== '') {
      result.push({ ok: false, result: '结论错误，危险性类别应为空' })
    }
    if (unno !== '') {
      result.push({ ok: false, result: '结论错误，非限制性，UN编号应为空' })
    }
    if (packageGrade !== '') {
      result.push({ ok: false, result: '结论错误，非限制性，包装等级应为空' })
    }
  }
  return result
}

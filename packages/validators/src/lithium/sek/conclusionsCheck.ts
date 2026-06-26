import type { CheckResult } from '../shared/types'
import { properShippingNameMap } from '../shared/consts/properShippingNameMap'

type UnnoKey = keyof typeof properShippingNameMap

/**
 * 锂离子电池结论检测
 * @param conclusions 结论
 * @param unno UN编号
 * @param otherDescribe 其他描述
 * @param inspectionResult1 瓦时数
 * @param btyGrossWeight 毛重
 * @param packageGrade
 * @param classOrDiv
 * @param isIon
 * @param properShippingName
 * @returns
 */
export function conclusionsCheck(
  conclusions: number,
  unno: string,
  otherDescribe: string,
  inspectionResult1: string,
  btyGrossWeight: number,
  packageGrade: string,
  classOrDiv: string,
  isIon: boolean,
  properShippingName: string,
  projectYear?: string
): CheckResult[] {
  const result: CheckResult[] = []
  unno = unno.trim()
  properShippingName = properShippingName.trim()
  packageGrade = packageGrade.trim()
  classOrDiv = classOrDiv.trim()
  if (projectYear === '2026' && unno === 'UN3171') {
    result.push({ ok: false, result: `2026年报告，UN3171已不适用` })
  }
  if (projectYear === undefined && unno === 'UN3171') {
    result.push({ ok: false, result: `UN3171已不适用，如果是25年报告请忽略` })
  }
  if (conclusions === 1) {
    // 危险品
    if (
      unno === 'UN3171' ||
      unno === 'UN3556' ||
      unno === 'UN3557' ||
      unno === 'UN3558' ||
      unno === 'UN3480' ||
      unno === 'UN3481' ||
      unno === 'UN3090' ||
      unno === 'UN3091'
    ) {
      let unKey: UnnoKey = unno as UnnoKey
      if (unno === 'UN3481' || unno === 'UN3091') {
        // 内置
        if (otherDescribe === '542') {
          unKey = (unno + '-C') as UnnoKey
        } else {
          // 包装
          unKey = (unno + '-P') as UnnoKey
        }
      }
      if (properShippingNameMap[unKey] !== properShippingName) {
        result.push({
          ok: false,
          result: `结论错误，运输专有名称错误，应为${properShippingNameMap[unKey]}`,
        })
      }
    } else {
      result.push({
        ok: false,
        result: 'UN编号错误',
      })
    }

    if (['≤1g', '≤2g'].includes(inspectionResult1) && unno !== 'UN3557') {
      result.push({
        ok: false,
        result: '结论错误，锂含量小于1g或2g，应为非限制性',
      })
    }
    if (['≤100Wh', '≤20Wh'].includes(inspectionResult1) && unno !== 'UN3556') {
      result.push({
        ok: false,
        result: '结论错误，瓦时数小于100Wh或者20Wh，应为非限制性',
      })
    }
    // 单独运输
    if (otherDescribe === '540' && isIon && unno !== 'UN3480') {
      result.push({
        ok: false,
        result: '结论错误，单独运输，UN编号应为UN3480',
      })
    }
    if (otherDescribe === '540' && !isIon && unno !== 'UN3090') {
      result.push({
        ok: false,
        result: '结论错误，单独运输，UN编号应为UN3090',
      })
    }

    // 危险品，设备内置或与设备包装在一起的电池
    if (otherDescribe !== '540' && !['UN3556', 'UN3557', 'UN3481'].includes(unno) && isIon)
      result.push({
        ok: false,
        result: '危险品，设备内置或与设备包装在一起的电池，UN编号应为UN3481',
      })
    if (otherDescribe !== '540' && unno !== 'UN3091' && !isIon)
      result.push({
        ok: false,
        result: '危险品，设备内置或与设备包装在一起的电池，UN编号应为UN3091',
      })
    if (classOrDiv !== '9') {
      result.push({
        ok: false,
        result: '危险品物品，危险性应为9',
      })
    }
    if (packageGrade !== '/') {
      result.push({
        ok: false,
        result: '危险品物品，包装等级应为斜杠',
      })
    }
  } else {
    // 非限制性
    if (['>2g', '>1g'].includes(inspectionResult1)) {
      result.push({
        ok: false,
        result: '结论错误，锂含量大于1g或2g，应为危险物品',
      })
    }
    if (['>100Wh', '>20Wh'].includes(inspectionResult1)) {
      result.push({
        ok: false,
        result: '结论错误，瓦时数大于100Wh或者20Wh，应为危险物品',
      })
    }
    if (unno !== '') {
      result.push({
        ok: false,
        result: '非限制性物品，UN编号应为空',
      })
    }
    if (properShippingName !== '') {
      result.push({
        ok: false,
        result: '非限制性物品，运输专有名称应为空',
      })
    }
    if (classOrDiv !== '') {
      result.push({
        ok: false,
        result: '非限制性物品，危险性应为空',
      })
    }
    if (packageGrade !== '') {
      result.push({
        ok: false,
        result: '非限制性物品，包装等级应为空',
      })
    }
    // 非限制性 单独运输 毛重大于30kg
    if (otherDescribe === '540' && btyGrossWeight > 30)
      result.push({
        ok: false,
        result: '结论错误，单独运输，毛重大于30kg，应为危险品',
      })
  }
  return result
}

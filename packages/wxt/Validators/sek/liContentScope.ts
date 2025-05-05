import { CheckResult } from "../shared/types/index";

/**
 * 锂含量范围检测
 * @param btyType 电池类型
 * @param inspectionResult1 锂含量范围
 * @param liContent 锂含量值
 * @returns 
 */
export function liContentScope(btyType: string, inspectionResult1: string, liContent: number): CheckResult[] {
  let result: CheckResult[] = []
  if (isNaN(liContent)) {
    if (['503', '505'].includes(btyType)) {
      if (liContent > 1) {
        if (inspectionResult1 !== '>1g')
          result.push({ ok: false, result: '锂含量取值范围错误，应>1g' })
      } else {
        if (inspectionResult1 !== '≤1g')
          result.push({ ok: false, result: '锂含量取值范围错误，应≤1g' })
      }
    } else {
      if (liContent > 2) {
        if (inspectionResult1 !== '>2g')
          result.push({ ok: false, result: '锂含量取值范围错误，应>2g' })
      } else {
        if (inspectionResult1 !== '≤2g')
          result.push({ ok: false, result: '锂含量取值范围错误，应≤2g' })
      }
    }
  }
  return result
}

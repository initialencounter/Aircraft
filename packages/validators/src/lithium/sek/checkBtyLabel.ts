import type { CheckResult } from '../shared/types'

/**
 * 锂含量范围检测
 * @param btyType 电池类型
 * @param inspectionResult1 锂含量范围
 * @param liContent 锂含量值
 * @returns
 */
export function checkBtyLabel(
  isBtyLabel: boolean,
  btyShape: string,
  conclusions: number
): CheckResult[] {
  const result: CheckResult[] = []
  if (isBtyLabel) {
    if (String(conclusions) === '1') {
      result.push({ ok: false, result: '危险品, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
    if (btyShape === '8aad92b65aae82c3015ab094788a0026') {
      result.push({ ok: false, result: '纽扣电池, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
  } else {
    if (String(conclusions) === '0'
      && btyShape !== '8aad92b65aae82c3015ab094788a0026') {
      result.push({
        ok: false,
        result: '未勾选包装件需要按照特殊规定188的要求进行适当标记。',
      })
    }
  }

  return result
}

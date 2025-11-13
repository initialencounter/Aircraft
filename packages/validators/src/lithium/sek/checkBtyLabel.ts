import type { CheckResult, SekBtyType } from '../shared/types'

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
  conclusions: number,
  btyType: SekBtyType, 
  otherDescribe2Pek: '0' | '1' | '2',
): CheckResult[] {
  const result: CheckResult[] = []
  const PI970II = otherDescribe2Pek === '2'&& btyType === '503' && String(conclusions) === '0'
  const PI978II = otherDescribe2Pek === '2'&& btyType === '601' && String(conclusions) === '0'
  if (isBtyLabel) {
    if (String(conclusions) === '1') {
      result.push({ ok: false, result: '危险品, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
    else if (btyShape === '8aad92b65aae82c3015ab094788a0026' && (PI970II || PI978II)) {
      result.push({ ok: false, result: 'PI970II || PI978II 纽扣电池, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
  } else {
    if (String(conclusions) === '0'
      && !(btyShape === '8aad92b65aae82c3015ab094788a0026' && (PI970II || PI978II))) {
      result.push({
        ok: false,
        result: '未勾选包装件需要按照特殊规定188的要求进行适当标记。',
      })
    }
  }

  return result
}

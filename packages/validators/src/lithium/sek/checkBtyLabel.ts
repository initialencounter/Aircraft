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
  is188: boolean,
  isCell: boolean,
): CheckResult[] {
  const result: CheckResult[] = []
  const isButtonCell = btyShape === '8aad92b65aae82c3015ab094788a0026' && !isCell
  if (isBtyLabel) {
    if (is188) {
      if (isButtonCell) result.push({ ok: false, result: '内置纽扣电芯, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
    else {
      result.push({ ok: false, result: '危险品, 不要勾选包装件需要按照特殊规定188的要求进行适当标记。' })
    }
  } else {
    if (is188) {
      result.push({
        ok: false,
        result: '未勾选包装件需要按照特殊规定188的要求进行适当标记。',
      })
    }
  }

  return result
}

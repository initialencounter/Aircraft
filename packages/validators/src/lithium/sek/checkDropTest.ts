import type { CheckResult } from '../shared/types'

/**
 * 锂含量范围检测
 * @param btyType 电池类型
 * @param inspectionResult1 锂含量范围
 * @param liContent 锂含量值
 * @returns
 */
export function checkDropTest(
  otherDescribe: string,
  dropTest: boolean,
  conclusions: number
): CheckResult[] {
  const result: CheckResult[] = []
  // 检验结果5 1.2米跌落
  if (!dropTest) {
    if (otherDescribe.includes('540') && String(conclusions) === '0') {
      result.push({ ok: false, result: '单独运输非限制性，未通过1.2米跌落' })
    }
    if (otherDescribe.includes('541') && String(conclusions) === '0') {
      result.push({
        ok: false,
        result: '非限制性和设备包装在一起，未通过1.2米跌落',
      })
    }
  } else {
    if (String(conclusions) === '1') {
      result.push({ ok: false, result: '危险品, 不需要勾选跌落' })
    }
    if (otherDescribe.includes('542')){
      result.push({ ok: false, result: '设备内置电池，不需要勾选跌落' })
    }
  }
  return result
}

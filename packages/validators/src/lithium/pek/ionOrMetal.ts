import type { CheckResult } from '../shared/types'

/**
 * 锂电池或金属检测
 * @param isIon 是否为锂离子电池
 * @param inspectionItem3Text1 瓦时数
 * @param inspectionItem4Text1 锂含量
 * @returns
 */
export function ionOrMetal(
  isIon: boolean,
  inspectionItem3Text1: string,
  inspectionItem4Text1: string
): CheckResult[] {
  const result: CheckResult[] = []
  // 鉴别项目1
  if (isIon) {
    if (inspectionItem3Text1 === '')
      result.push({ ok: false, result: '鉴别项目1错误，瓦时数为空' })
    if (inspectionItem4Text1 !== '')
      result.push({ ok: false, result: '鉴别项目1错误，锂含量不为空' })
  } else {
    if (inspectionItem3Text1 !== '')
      result.push({ ok: false, result: '鉴别项目1错误，瓦时数不为空' })
    if (inspectionItem4Text1 === '')
      result.push({ ok: false, result: '鉴别项目1错误，锂含量为空' })
  }
  return result
}

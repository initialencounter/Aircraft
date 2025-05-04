import type { CheckResult } from '../shared/types'
export function removeNonChineseCharacters(str: string): string {
  // 使用正则表达式匹配所有非中文字符并替换为空字符串
  return str.replace(/[^\u4e00-\u9fa5]/g, '')
}

export function checkClassification(
  classificationLLM: string,
  classification: string
): CheckResult[] {
  classification = removeNonChineseCharacters(
    String(classification).trim()
  ).trim()
  if (classificationLLM !== classification) {
    return [
      {
        ok: false,
        result: `UN报告上的电池类型为:${classificationLLM}，概要上的为:${classification}`,
      },
    ]
  }
  return []
}

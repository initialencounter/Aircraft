import type { CheckResult } from '../lithium/shared/types'
import { colorMap } from '../lithium/shared/appearence'

export function removeNonChineseCharacters(str: string): string {
  // 使用正则表达式匹配所有非中文字符并替换为空字符串
  return str.replace(/[^\u4e00-\u9fa5]/g, '')
}
export function isContainsChinese(str: string): boolean {
  const chineseRegex = /[\u4e00-\u9fa5]/
  return chineseRegex.test(str)
}
export function checkColor(
  formColorId: string,
  summaryShape: string,
  summaryColorId: string,
): CheckResult[] {
  let formColorChineseName = ''
  let colorText = ''
  if (isContainsChinese(summaryShape)) {
    summaryShape = removeNonChineseCharacters(summaryShape.trim())
    const spiltTexts = summaryShape.split('色')
    const shapeText = spiltTexts[spiltTexts.length - 1]
    colorText = summaryShape.replace(shapeText, '')
    colorMap.forEach((item) => {
      if (item.chineseName === colorText) {
        summaryColorId = item.id
      }
      if (formColorId === item.id) {
        formColorChineseName = item.chineseName
      }
    })
  } else {
    colorMap.forEach((item) => {
      if (item.id === summaryColorId) {
        colorText = item.chineseName
      }
      if (item.id === formColorId) {
        formColorChineseName = item.chineseName
      }
    })
  }

  if (summaryColorId && summaryColorId !== formColorId) {
    return [
      {
        ok: false,
        result: `颜色不一致, 系统上为${formColorChineseName ?? '空'}, 概要上为${colorText}`,
      },
    ]
  }
  return []
}

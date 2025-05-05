import { CheckResult } from "../shared/types/index"
import { colorMap } from "../shared/appearence/color"

export function removeNonChineseCharacters(str: string): string {
  // 使用正则表达式匹配所有非中文字符并替换为空字符串
  return str.replace(/[^\u4e00-\u9fa5]/g, '');
}

export function checkColor(
  formColorId: string, summaryShape: string,
): CheckResult[] {
  summaryShape = removeNonChineseCharacters(summaryShape.trim())
  const spiltTexts = summaryShape.split('色')
  const shapeText = spiltTexts[spiltTexts.length - 1]
  const colorText = summaryShape.replace(shapeText, '')
  let formColorChineseName = ''
  let summaryColorId = ''
  colorMap.forEach(item => {
    if (item.chineseName === colorText) {
      summaryColorId = item.id
    }
    if (formColorId === item.id) {
      formColorChineseName = item.chineseName
    }
  })
  if (summaryColorId && summaryColorId !== formColorId) {
    return [{
      ok: false,
      result: `颜色不一致, 系统上为${formColorChineseName ?? '空'}, 概要上为${colorText}`
    }]
  }
  return []
}
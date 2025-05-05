import { shapeMap } from "../shared/appearence/index"
import { CheckResult } from "../shared/types/index"

function removeNonChineseCharacters(str: string): string {
  // 使用正则表达式匹配所有非中文字符并替换为空字符串
  return str.replace(/[^\u4e00-\u9fa5]/g, '');
}

export function checkShape(formShape: string, summaryShape: string): CheckResult[] {
  summaryShape = removeNonChineseCharacters(summaryShape.trim())
  const splitTexts = summaryShape.split('色')
  const shapeText = splitTexts[splitTexts.length - 1]
  let formShapeChineseName = ''
  let summaryShapeId = ''
  shapeMap.forEach(item => {
    if (formShape === item.id) {
      formShapeChineseName = item.chineseName
    }
    if (item.chineseName === shapeText) {
      summaryShapeId = item.id
    }
  })
  if (formShape !== summaryShapeId && summaryShapeId) {
    return [{
      ok: false,
      result: `形状不一致, 系统上为${formShapeChineseName ?? '空'}, 概要上为${shapeText}`
    }]
  }
  return []
}
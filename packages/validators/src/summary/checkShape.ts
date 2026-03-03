import { shapeMap } from '../lithium/shared/appearence'
import type { CheckResult } from '../lithium/shared/types'
import { isContainsChinese } from './checkColor'

function removeNonChineseCharacters(str: string): string {
  // 使用正则表达式匹配所有非中文字符并替换为空字符串
  return str.replace(/[^\u4e00-\u9fa5]/g, '')
}

export function matchShape(summaryShape: string): string {
  summaryShape = removeNonChineseCharacters(summaryShape.trim())
  const splitTexts = summaryShape.split('色')
  return splitTexts[splitTexts.length - 1]
}

export function checkShape(
  formShape: string,
  summaryShape: string
): CheckResult[] {
  let formShapeChineseName = ''
  let summaryShapeId = ''
  let shapeText = ''
  if (isContainsChinese(summaryShape)) {
    shapeText = matchShape(summaryShape)
    shapeMap.forEach((item) => {
      if (formShape === item.id) {
        formShapeChineseName = item.chineseName
      }
      if (item.chineseName === shapeText) {
        summaryShapeId = item.id
      }
    })
  } else {
    summaryShapeId = summaryShape
    shapeMap.forEach((item) => {
      if (item.id === summaryShape) {
        shapeText = item.chineseName
      }
      if (item.id === formShape) {
        formShapeChineseName = item.chineseName
      }
    })
  }

  if (formShape !== summaryShapeId && summaryShapeId) {
    return [
      {
        ok: false,
        result: `形状不一致, 系统上为${formShapeChineseName ?? '空'}, 概要上为${shapeText}`,
      },
    ]
  }
  return []
}

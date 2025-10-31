import type { CheckResult } from './types'

/**
 * 项目中文名称与电池类型检测
 * @param itemCName 项目中文名称
 * @param btyType 电池类型
 * @returns
 */
export function itemCNameBtyType(
  itemCName: string,
  btyType: string
): CheckResult[] {
  if (itemCName.includes('芯') && !['501', '503', '601'].includes(btyType))
    return [{ ok: false, result: '电池类型应为电芯' }]
  return []
}

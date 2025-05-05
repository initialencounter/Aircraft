import { CheckResult } from "./types/index";

/**
 * 项目中文名称与电池型号检测
 * @param itemCName 项目中文名称
 * @param itemEName 项目英文名称
 * @param btyKind 电池种类
 * @returns 
 */
export function itemNameModel(itemCName: string, itemEName: string, btyKind: string): CheckResult[] {
  let result: CheckResult[] = []
  if (!itemCName.includes(btyKind))
    result.push({
      ok: false,
      result: '型号或中文品名错误，电池型号不在项目中文名称中'
    })
  if (!itemEName.includes(btyKind))
    result.push({
      ok: false,
      result: '型号或英文品名错误，电池型号不在项目英文名称中'
    })
  return result
}

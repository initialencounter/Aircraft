import type { GoodsInfo } from 'aircraft-rs'
import type { CheckResult, PkgInfoSubType } from '../../lithium/shared/types'
import { checkItemCName } from './checkItemCName'
import {
  getPekExpectedLabel,
  getSekExpectedLabel,
  checkLabel,
} from './checkLabel'
import { checkProjectNo } from './checkProjectNo'

export { getPekExpectedLabel, getSekExpectedLabel, checkLabel }

export function checkSekGoods(
  conclusions: number,
  UNNO: string,
  itemCName: string,
  projectNo: string,
  goodsInfo: GoodsInfo | null
): CheckResult[] {
  if (!goodsInfo) {
    return [{ ok: false, result: 'everything搜不到图片, 无法验证图片编号和物品名称' }]
  }
  const results: CheckResult[] = []
  const expectedLabel = getSekExpectedLabel(conclusions, UNNO)
  results.push(...checkLabel(expectedLabel, goodsInfo.labels))
  results.push(...checkItemCName(itemCName, goodsInfo.itemCName))
  results.push(...checkProjectNo(projectNo, goodsInfo.projectNo))
  return results
}

export function checkPekGoods(
  pkgInfoSubType: PkgInfoSubType,
  netWeight: number,
  itemCName: string,
  projectNo: string,
  goodsInfo: GoodsInfo | null
): CheckResult[] {
  if (!goodsInfo) {
    return [{ ok: false, result: 'everything搜不到图片, 无法验证图片编号和物品名称和标签' }]
  }
  const results: CheckResult[] = []
  const expectedLabel = getPekExpectedLabel(pkgInfoSubType, netWeight)
  results.push(...checkLabel(expectedLabel, goodsInfo.labels))
  results.push(...checkItemCName(itemCName, goodsInfo.itemCName))
  results.push(...checkProjectNo(projectNo, goodsInfo.projectNo))
  return results
}

import { GoodsInfo } from "../../shared/types/attachment";
import { CheckResult, PkgInfoSubType} from "../../shared/types/index";
import { checkItemCName } from "./checkItemCName";
import { getPekExpectedLabel, getSekExpectedLabel, checkLabel } from "./checkLabel";
import { checkProjectNo } from "./checkProjectNo";

export { getPekExpectedLabel, getSekExpectedLabel, checkLabel }

export function checkSekGoods(conclusions: number, UNNO: string, itemCName: string, projectNo: string, goodsInfo: GoodsInfo): CheckResult[] {
  let results: CheckResult[] = []
  const expectedLabel = getSekExpectedLabel(conclusions, UNNO)
  results.push(...checkLabel(expectedLabel, goodsInfo.labels))
  results.push(...checkItemCName(itemCName, goodsInfo.name))
  results.push(...checkProjectNo(projectNo, goodsInfo.projectNo))
  return results
}

export function checkPekGoods(pkgInfoSubType: PkgInfoSubType, netWeight: number, itemCName: string, projectNo: string, goodsInfo: GoodsInfo): CheckResult[] {
  let results: CheckResult[] = []
  const expectedLabel = getPekExpectedLabel(pkgInfoSubType, netWeight)
  results.push(...checkLabel(expectedLabel, goodsInfo.labels))
  results.push(...checkItemCName(itemCName, goodsInfo.name))
  results.push(...checkProjectNo(projectNo, goodsInfo.projectNo))
  return results
}

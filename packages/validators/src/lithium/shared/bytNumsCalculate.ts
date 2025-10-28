import type { CheckResult } from './types'
import {
  match966BatteryNumber,
  match967BatteryNumber,
  matchDeviceNumber,
} from './utils/matchDevice'

/**
 * 电池净重计算
 * @param btyCount 电池数量
 * @param otherDescribeCAddition 描述信息
 * @param inspectionItem1 包装方式
 * @returns
 */
export function bytNumsCalculate(
  btyCount: number,
  otherDescribeCAddition: string,
  inspectionItem1: '0' | '1' | '2',
  isChargeBoxOrRelated: boolean,
): CheckResult[] {
  if (isChargeBoxOrRelated) {
    return []
  }
  // 单独运输
  if (inspectionItem1 === '0') {
    return []
  } else if (inspectionItem1 === '1') {
    const matchedBytCountPeerDevice = match966BatteryNumber(
      otherDescribeCAddition
    )
    return check(matchedBytCountPeerDevice, otherDescribeCAddition, btyCount)
  } else if (inspectionItem1 === '2') {
    const matchedBytCountPeerDevice = match967BatteryNumber(
      otherDescribeCAddition
    )
    return check(matchedBytCountPeerDevice, otherDescribeCAddition, btyCount)
  }
  return []
}

function check(
  matchedBytCountPeerDevice: number,
  otherDescribeCAddition: string,
  btyCount: number
) {
  const matchDeviceCount = matchDeviceNumber(otherDescribeCAddition)
  const matchedBytCount = matchedBytCountPeerDevice * matchDeviceCount
  if (matchedBytCountPeerDevice === 0) {
    return []
  }
  if (btyCount !== matchedBytCount) {
    return [
      {
        ok: false,
        result: `电池数量不匹配, 电池数量为${btyCount}, 描述中匹配到电池数量为${matchedBytCount}`,
      },
    ]
  }
  return []
}

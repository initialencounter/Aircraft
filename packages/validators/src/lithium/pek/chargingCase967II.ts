import type { CheckResult } from '../shared/types'

/**
 * 开启状态运输
 * @param otherDescribe 其他描述
 * @returns
 */
export function chargingCase967II(
  isChargingCase: boolean,
  otherDescribeCAddition: string
): CheckResult[] {
  if (!isChargingCase) return [];
  if (otherDescribeCAddition.includes('符合包装说明967第II部分')) return [];
  return [{
    ok: false,
    result: '充电盒，描述中不存在“锂离子电芯符合包装说明967第II部分”',
  }]
}

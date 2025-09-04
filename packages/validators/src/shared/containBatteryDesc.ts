import type { CheckResult } from './types'

export function containBatteryDesc(otherDescribeCAddition: string, inspectionItem1: string): CheckResult[] {
  if (inspectionItem1 !== '2') return []
  if (!otherDescribeCAddition.includes('已经做好防短路措施并已采取防止意外启动措施')) {
    return [{
      ok: false,
      result: '描述中缺少: "该电[池/芯]已经做好防短路措施并已采取防止意外启动措施"'
    }]
  }
  return [];
}
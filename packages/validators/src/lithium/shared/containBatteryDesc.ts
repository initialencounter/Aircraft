import type { CheckResult } from './types'

export function containBatteryDesc(otherDescribeCAddition: string, inspectionItem1: string, activeState: boolean): CheckResult[] {
  if (inspectionItem1 !== '2') return []
  if (!otherDescribeCAddition.includes('已经做好防短路措施并已采取防止意外启动措施') && !activeState) {
    return [{
      ok: false,
      result: '描述中缺少: "该电[池/芯]已经做好防短路措施并已采取防止意外启动措施"'
    }]
  }
  if (activeState && otherDescribeCAddition.includes('已采取防止意外启动措施')) {
    return [{
      ok: false,
      result: '开启状态运输，描述中不应包含: "已采取防止意外启动措施"'
    }]
  }
  return [];
}

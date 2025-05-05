import { CheckResult } from "../shared/types/index"

const remarkPreventingAccidentalActivationMap = {
  'AEK': '3c91808276a9d82d017833f4de822e9f',
  'REK': '4c91808276a9d82d017833f4de822e9f',
  'SEK': '2c91808276a9d82d017833f4de822e9f'
}

const remarkPreventingShortCircuitMap = {
  'AEK': '3aad92b659404f660159431a20630007',
  'REK': '4aad92b659404f660159431a20630007',
  'SEK': '8aad92b659404f660159431a20630007'
}

export function checkReMark(remarks: string, projectNo: string, conclusions: number, otherDescribe: string): CheckResult[] {
  let result: CheckResult[] = []
  if (!projectNo) return result
  let systemId = projectNo.slice(0, 3) as keyof typeof remarkPreventingAccidentalActivationMap
  if (otherDescribe === '542') {
    if (remarks !== remarkPreventingAccidentalActivationMap[systemId]) {
      result.push({
        ok: false,
        result: '注意事项错误，应为：必须防止设备意外启动。'
      })
    }
  }
  else if (otherDescribe === '540') {
    if (remarks !== remarkPreventingShortCircuitMap[systemId]) {
      result.push({
        ok: false,
        result: '注意事项错误，应为：每一单电池必须做好防短路措施，并装入坚固外包装内。'
      })
    }
  }
  return result
}
import type { CheckResult } from '../shared/types'

/**
 * 开启状态运输
 * @param otherDescribe 其他描述
 * @returns
 */
export function activeStateWarn(
  otherDescribe: string
): CheckResult[] {
  const result: CheckResult[] = []
  if (otherDescribe.includes('2c91808467b775430167bb4c65a35bc9')) {
    result.push({
      ok: false,
      result: '已勾选开启运输, 请确认模板是否正确',
    })
  }
  return result
}

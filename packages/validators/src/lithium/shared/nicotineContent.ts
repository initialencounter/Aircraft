import type { CheckResult } from './types'

export function checkNicotineContent(
  otherDescribeCAddition: string
): CheckResult[] {
  const hasNicotine =
    otherDescribeCAddition.includes('尼古丁含量') ||
    otherDescribeCAddition.includes('尼古丁盐含量')
  const hasFivePercent = otherDescribeCAddition.includes('5%')
  const hasPointFivePercent = otherDescribeCAddition.includes('.5%')
  const hasMassVolume = otherDescribeCAddition.includes('质量体积')

  if (hasNicotine && hasFivePercent && !hasMassVolume && !hasPointFivePercent) {
    return [
      {
        ok: false,
        result: '尼古丁含量5%缺少质量体积分数',
      },
    ]
  }

  return []
}

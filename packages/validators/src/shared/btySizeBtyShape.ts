import type { CheckResult } from './types'

/**
 * 电池尺寸或形状检测
 * @param btySize 电池尺寸
 * @param btyShape 电池形状
 * @returns
 */
export function btySizeBtyShape(
  btySize: string,
  btyShape: string
): CheckResult[] {
  if (
    btySize.includes('Φ') ||
    btySize.includes('φ') ||
    btySize.includes('Ø') ||
    btySize.includes('ø')
  ) {
    // 扣式 近圆柱体 圆柱体 球形
    if (
      ![
        '8aad92b65aae82c3015ab094788a0026',
        '8aad92b65d7a7078015d7e1bb1a2245d',
        '521',
        '2c9180838b90642e018bf132f37f5a60',
      ].includes(btyShape)
    ) {
      return [
        {
          ok: false,
          result: '电池形状或尺寸错误，应为扣式 近圆柱体 圆柱体 球形',
        },
      ]
    }
  }
  return []
}

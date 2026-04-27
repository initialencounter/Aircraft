import type { CheckResult, PkgInfoSubType } from '../../lithium/shared/types'

function getPekExpectedLabel(
  pkgInfoSubType: PkgInfoSubType,
  netWeight: number,
): string[] {
  const label = []
  switch (pkgInfoSubType) {
    case '952':
      label.push('9A')
      break
    case '965, IA':
    case '968, IA':
    case '976':
      label.push('9A', 'CAO')
      break
    case '965, IB':
    case '968, IB':
      label.push('9A', 'CAO', 'UN3480')
      break
    case '966, I':
    case '969, I':
    case '967, I':
    case '970, I':
    case '977, I':
    case '978, I':
      label.push('9A')
      if (netWeight > 5) {
        label.push('CAO')
      }
      break
    case '966, II':
    case '967, II':
      label.push('UN3481')
      break
    case '969, II':
    case '970, II':
      label.push('UN3091')
      break
    case '977, II':
    case '978, II':
      label.push('UN3552')
      break
  }
  return label
}
// 结论 1 危险品 0 非限制性物品
function getSekExpectedLabel(
  conclusions: number,
  UNNO: string,
  isSodium: boolean,
  otherDescribe: string,
  isIon: boolean,
): string[] {
  if (['UN3556', 'UN3557', 'UN3558'].includes(UNNO)) {
    return ['9A']
  }
  if (['UN3171'].includes(UNNO)) {
    return ['9']
  }
  if (conclusions === 1) {
    return ['9A']
  } else {
    if (isSodium) {
      if (otherDescribe === '540') {
        return ['UN3551']
      } else {
        return ['UN3552']
      }
    } else {
      if (isIon) {
        if (otherDescribe === '540') {
          return ['UN3480']
        } else {
          return ['UN3481']
        }
      } else {
        if (otherDescribe === '540') {
          return ['UN3090']
        } else {
          return ['UN3091']
        }
      }
    }
  }
}

function sortLabel(arr: string[]): string[] {
  return arr.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))
}

function checkLabel(
  expectedLabel: string[],
  goodsLabels: string[]
): CheckResult[] {
  if (goodsLabels[0] === 'pass') {
    return []
  }
  expectedLabel = sortLabel(expectedLabel)
  goodsLabels = sortLabel(goodsLabels)
  if (expectedLabel.length !== goodsLabels.length) {
    return [
      {
        ok: false,
        result: `标签不一致，预期标签：${expectedLabel.join(',')}, 实际标签：${goodsLabels.join(',')}`,
      },
    ]
  }
  for (let i = 0; i < expectedLabel.length; i++) {
    if (expectedLabel[i] !== goodsLabels[i]) {
      return [
        {
          ok: false,
          result: `标签不一致，预期标签：${expectedLabel.join(',')}, 实际标签：${goodsLabels.join(',')}`,
        },
      ]
    }
  }
  return []
}

export { getPekExpectedLabel, getSekExpectedLabel, checkLabel }

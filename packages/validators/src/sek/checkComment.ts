import type { CheckResult } from '../shared/types'

const comment188Map = {
  AEK: '3aad92b6595aada201595aaf03370000',
  REK: '4aad92b6595aada201595aaf03370000',
  SEK: '8aad92b6595aada201595aaf03370000',
}

const commentUNMap = {
  AEK: '3200',
  REK: '4200',
  SEK: '1200',
}

export function checkComment(
  comment: string,
  projectNo: string,
  conclusions: number,
  otherDescribe: string
): CheckResult[] {
  const result: CheckResult[] = []
  if (!projectNo) return result
  const systemId = projectNo.slice(0, 3) as keyof typeof comment188Map
  if (conclusions === 1) {
    if (['540', '541'].includes(otherDescribe)) {
      if (comment !== commentUNMap[systemId]) {
        result.push({
          ok: false,
          result:
            '单独运输或外配危险品，备注应为：包装必须达到 II 级包装的性能标准。。',
        })
      }
    } else {
      if (comment !== '') {
        result.push({
          ok: false,
          result: '内置危险品，备注应为空',
        })
      }
    }
  } else {
    if (comment !== comment188Map[systemId]) {
      result.push({
        ok: false,
        result: '非限制性物品，备注应为：根据IMDG CODE特殊规定188不受限制。',
      })
    }
  }
  return result
}

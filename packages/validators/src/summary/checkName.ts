import type { CheckResult } from '../lithium/shared/types'

function findAllPositions(str: string, searchStr: string): number[] {
  const positions = [];
  let pos = str.indexOf(searchStr);

  while (pos !== -1) {
    positions.push(pos);
    pos = str.indexOf(searchStr, pos + 1);
  }
  positions.reverse()
  return positions;
}

// inspectionItem1 0 965 1 966 2 967
export function checkName(
  packageType: '0' | '1' | '2',
  formEName: string,
  formCName: string,
  model: string,
  summaryCName: string,
  summaryEName: string,
): CheckResult[] {
  formCName = formCName.trim().replace(/<[^>]+>/g, '')
  formEName = formEName.trim().replace(/<[^>]+>/g, '')
  summaryCName = summaryCName.trim().replace(/<[^>]+>/g, '')
  summaryEName = summaryEName.trim().replace(/<[^>]+>/g, '')
  model = model.trim()
  let formCNameText = ''
  let formENameText = ''
  switch (packageType) {
    case '0':
    case '1':
      const packCPosition = formCName.search(/与(.+)包装在一起/)
      const packEPosition = formEName.search(/[Pp]acked\s[Ww]ith/)
      const wattHourPosition = formCName.search(/\s?\d+\.?\d+\s?[mMkK]?[Ww][Hh]/)
      // 设备名称在前面 与xxx电池包装在一起
      if (packCPosition < wattHourPosition) {
        const indexModel = findAllPositions(formCName, model)[0]
        const indexEModel = findAllPositions(formEName, model)[0]
        formCNameText = formCName.substring(packCPosition + 1, indexModel)
        formENameText = formEName.substring(packEPosition + 11, indexEModel)
      } else {// 电池名称在前面
        formCNameText = formCName.split(model)[0]
        formENameText = formEName.split(model)[0]
      }
      break
    case '2':
      const indexKeyWord = formCName.indexOf('内置')
      const indexKeyEWord = formEName.indexOf('Containing')
      const indexModel = formCName.indexOf(model)
      const indexEModel = formEName.indexOf(model)
      if (indexKeyWord < indexModel) {
        formCNameText = formCName.substring(indexKeyWord + 2, indexModel)
        formENameText = formEName.substring(indexKeyEWord + 10, indexEModel)
      } else {
        formCNameText = formCName.substring(0, indexModel)
        formENameText = formEName.substring(0, indexModel)
      }
      break
  }
  formCNameText = formCNameText.trim()
  formENameText = formENameText.trim()
  const result: CheckResult[] = []
  if (!summaryEName) {
    if (!summaryCName.includes(formCNameText)) {
      result.push({
        ok: false,
        result: `中文电池名称不一致, 系统上为${formCNameText}, 概要上为${summaryCName}`,
      })
    }
    if (!summaryCName.includes(formENameText)) {
      result.push({
        ok: false,
        result: `英文电池名称不一致, 系统上为${formENameText}, 概要上为${summaryEName}`,
      })
    }
  } else {
    if (summaryCName !== formCNameText) {
      result.push({
        ok: false,
        result: `中文电池名称不一致, 系统上为${formCNameText}, 概要上为${summaryCName}`,
      })
    }
    if (summaryEName !== formENameText) {
      result.push({
        ok: false,
        result: `英文电池名称不一致, 系统上为${formENameText}, 概要上为${summaryEName}`,
      })
    }
  }
  return result
}

// console.log(checkName('1',
//   'Mobile POS QPOS Plus（Packed with Rechargeable Li-ion Battery QPOS Plus 3.7V 1800mAh 6.66Wh）',
//   '移动 POS 机 QPOS Plus（与可充电锂离子电池 QPOS Plus 3.7V 1800mAh 6.66Wh 包装在一起）',
//   'QPOS Plus',
//   '移动 POS 机',
//   'QPOS Plus',
//   '可充电锂离子电池',
//   'Rechargeable Li-ion Battery'
// ))

// console.log(checkName('1',
//   'Smart Door Lock Lithium Battery HK-03 7.4V 5000mAh 37Wh (Packed with Digital smart lock A10)',
//   '智能门锁锂电池组 HK-03 7.4V 5000mAh 37Wh （与智能门锁 A10包装在一起）',
//   'HK-03',
//   '智能门锁',
//   'A10',
//   '智能门锁锂电池组',
//   'Smart Door Lock Lithium Battery'
// ))
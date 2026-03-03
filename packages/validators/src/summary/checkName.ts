import type { CheckResult } from '../lithium/shared/types'

function findAllPositions(str: string, searchStr: string): number[] {
  const positions = [];
  let pos = str.indexOf(searchStr);

  while (pos !== -1) {
    positions.push(pos);
    pos = str.indexOf(searchStr, pos + 1);
  }

  return positions;
}

// inspectionItem1 0 965 1 966 2 967
export function checkName(
  packageType: '0' | '1' | '2',
  formEName: string,
  formCName: string,
  model: string,
  deviceCName: string,
  deviceModel: string,
  summaryCName: string,
  summaryEName: string,
): CheckResult[] {
  formCName = formCName.trim().replace(/<[^>]+>/g, '')
  formEName = formEName.trim().replace(/<[^>]+>/g, '')
  summaryCName = summaryCName.trim().replace(/<[^>]+>/g, '')
  summaryEName = summaryEName.trim().replace(/<[^>]+>/g, '')
  model = model.trim()
  deviceModel = deviceModel.trim()
  let formCNameText = ''
  let formENameText = ''
  switch (packageType) {
    case '0':
    case '1':
      if (!deviceCName || !deviceModel) {
        return []
      }
      const deviceCNamePosition = formCName.indexOf(deviceCName)
      const deviceModelPosition = formCName.indexOf(deviceModel)
      const modelPosition = formCName.indexOf(model)
      // 设备名称在前面
      if (deviceCNamePosition < modelPosition && deviceModelPosition < modelPosition) {
        const indexKeyWord = formCName.search(/与(.+)包装在一起/)
        const indexKeyEWord = formEName.search(/[Pp]acked\s[Ww]ith/)
        if (deviceModel.includes(model)) {
          const indexModel = findAllPositions(formCName, model)[1]
          const indexEModel = findAllPositions(formEName, model)[1]
          formCNameText = formCName.substring(indexKeyWord + 1, indexModel)
          formENameText = formEName.substring(indexKeyEWord + 11, indexEModel)
        } else {
          const indexModel = formCName.indexOf(model)
          const indexEModel = formEName.indexOf(model)
          formCNameText = formCName.substring(indexKeyWord + 1, indexModel)
          formENameText = formEName.substring(indexKeyEWord + 11, indexEModel)
        }
      }
      // 电池名称在前面
      else {
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

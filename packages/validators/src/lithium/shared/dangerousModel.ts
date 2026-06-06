import { EntrustData } from "./types"

export function checkModel(dangerousModels: string[], model: string, selector: string) {
  if (dangerousModels.includes(model)) return [{ ok: false, result: "危险型号: " + model, selector }]
  return []
}

export function checkModelWithFactory(entrustData: EntrustData | null, dangerousModels: { model: string, factory: string }[], model: string, selector: string) {

  if (!entrustData) {
    return [{ ok: false, result: '系统制造商获取失败, 无法验证危险型号', selector: '' }]
  }

  for (let battery of dangerousModels) {
    if (battery.factory === entrustData.manufacturer && battery.model === model) {
      return [{ ok: false, result: battery.factory + "危险型号: " + model, selector }]
    }
  }
  return []
}

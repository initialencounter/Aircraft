import { EntrustData } from "@aircraft/validators";

export function checkModel(dangerousModels: string[], model: string) {
  if (dangerousModels.includes(model)) return [{ok: false, result: "危险型号: "+model}]
  return []
}

export function checkModelWithFactory(entrustData: EntrustData, dangerousModels: {model:string, factory:string}[], model: string) {
  for(let battery of dangerousModels){
    if (battery.factory === entrustData.manufacturer && battery.model === model){
      return [{ok: false, result: battery.factory+ "危险型号: "+model}]
    }
  }
  return []
}

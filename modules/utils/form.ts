import { getCurrentProjectNo } from './helpers'
import { PekFullData, SekFullData, PekTypeTransMap, SekTypeTransMap } from '../../share/const'

/**
 * 从表单获取数据
 */
export function getFormData<T>(systemId: 'pek' | 'sek'): T {
  const form = document.querySelector('#batteryInspectForm') as HTMLFormElement
  // 获取表单数据
  const formData = new FormData(form)
  const data: Partial<T> = {}

  let projectNo = getCurrentProjectNo()
  // @ts-ignore
  data['projectNo'] = projectNo ?? ''
  // 遍历 FormData 并构建数据对象
  formData.forEach((value, name) => {
    if (data[name as keyof Partial<T>]) {
      // 如果已存在该字段，添加逗号并附加新值
      data[name as keyof Partial<T>] = (data[name as keyof Partial<T>] + `,${value}`) as T[keyof T]
    } else {
      // 如果是新字段，直接赋值
      data[name as keyof Partial<T>] = value as T[keyof T]
    }
  })
  if (!(data['unno' as keyof Partial<T>] as string).startsWith('UN') && (data['unno' as keyof Partial<T>] as string).trim().length > 0) {
    (data['unno' as keyof Partial<T>] as string) = 'UN' + data['unno' as keyof Partial<T>]
  }
  if (systemId === 'pek') {
    Object.keys(PekFullData).forEach(key => {
      if (data[key as keyof Partial<T>] === undefined) {
        // @ts-ignore
        data[key as keyof Partial<T>] = PekFullData[key]
      }
    })
    PekTypeTransMap.forEach(key => {
      if (data[key as keyof Partial<T>] !== undefined) {
        data[key as keyof Partial<T>] = Number(data[key as keyof Partial<T>]) as T[keyof T]
      }
    })
  } else {
    Object.keys(SekFullData).forEach(key => {
      if (data[key as keyof Partial<T>] === undefined) {
        // @ts-ignore
        data[key as keyof Partial<T>] = SekFullData[key]
      }
    })
    SekTypeTransMap.forEach(key => {
      if (data[key as keyof Partial<T>] !== undefined) {
        data[key as keyof Partial<T>] = Number(data[key as keyof Partial<T>]) as T[keyof T]
      }
    })
  }
  return data as T
}

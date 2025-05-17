import type { EntrustFormData } from './types'

let amountStatus = '500.00'

export async function startListenAmount(money: string = '500.00') {
  const inputSpan = document.querySelector(
    '#entrustEditForm > table > tbody > tr:nth-child(5) > td:nth-child(4) > span'
  ) as HTMLSpanElement
  if (inputSpan) {
    inputSpan.addEventListener('click', () => {
      setAmount(amountStatus)
    })
  }

  const input = document.querySelector('#amount')?.parentElement?.children[1]
    .children[0] as HTMLInputElement
  if (input) {
    input.addEventListener('input', (e) => {
      let value = (e.target as HTMLInputElement).value
      console.log('input value:', value)
      value = value.replace('￥', '')
      if (!value) value = '0.00'
      setAmount(value)
      amountStatus = value
    })
  }

  setInterval(function () {
    const data = getFormData()
    if (!data) return
    if (data.amount !== amountStatus) {
      amountStatus = data.amount
    }
    if (data.amount === '480.00') {
      setAmount(money)
    }
    if (data.amount === '680.00') {
      setAmount(String(Number(money) + 200) + '.00')
    }
  }, 33)
}

// 获取当前初验单的数据
export function getFormData() {
  const formElement = document.forms[0] as HTMLFormElement
  if (!formElement) return
  // 获取表单数据
  const formData = new FormData(formElement)
  const data: Partial<EntrustFormData> = {}

  // 遍历 FormData 并构建数据对象
  formData.forEach((value, name) => {
    if (data[name as keyof Partial<EntrustFormData>]) {
      // 如果已存在该字段，添加逗号并附加新值
      data[name as keyof Partial<EntrustFormData>] = (data[
        name as keyof Partial<EntrustFormData>
      ] + `,${value}`) as EntrustFormData[keyof EntrustFormData]
    } else {
      // 如果是新字段，直接赋值
      data[name as keyof Partial<EntrustFormData>] =
        value as EntrustFormData[keyof EntrustFormData]
    }
  })
  if (!data) return
  return data as EntrustFormData
}

async function setAmount(money: string) {
  amountStatus = money
  const hiddenInput = document.querySelector('#amount') as HTMLInputElement
  if (hiddenInput) {
    hiddenInput.value = '500.00'
  }
  const valueInput = document.querySelector('#amount')?.parentElement
    ?.children[1].children[1] as HTMLInputElement
  if (valueInput) {
    valueInput.value = money
  }
  const textInput = document.querySelector('#amount')?.parentElement
    ?.children[1].children[0] as HTMLInputElement
  if (textInput) {
    textInput.value = '￥' + money
  }
}

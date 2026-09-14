import { fixFloatPrecision, matchBatteryWeight, matchCapacity, matchNumber, matchVoltage } from "../../../../validators/src/lithium/shared/utils"
import { markErrorElement } from "./markError"

export function insertCalculationText(systemId: string) {
  // 如果已存在则跳过，保证幂等性
  if (document.getElementById('calculatorDisplay')) return

  // 注入高亮数字的样式（仅首次）
  if (!document.getElementById('calc-highlight-style')) {
    const style = document.createElement('style')
    style.id = 'calc-highlight-style'
    style.textContent = '.calc-highlight { color: #FF6347; font-weight: 700; }'
    document.head.appendChild(style)
  }

  // 根据 systemId 选择目标输入元素: sek → btyNetWeight, pek → netWeight
  const inputName = systemId === 'PEKGZ' ? 'netWeight' : 'btyNetWeight'
  const input = document.getElementsByName(inputName)[0]
  if (!input) return

  // 从输入框向上找到外层 <span>（textbox 的父元素），在 "kg" 之后追加计算过程文本
  const outerSpan = input.parentElement!.parentElement!
  const display = document.createElement('span')
  display.id = 'calculatorDisplay'
  display.textContent = ''
  display.style.paddingLeft = '8px'
  outerSpan.appendChild(display)
  updateCalculationText(systemId)
}


// 更新计算过程文本
export function updateCalculationText(systemId: string) {
  const inputName = systemId === 'PEKGZ' ? 'netWeight' : 'btyNetWeight'
  const btyCount = (document.getElementById('btyCount') as HTMLInputElement)?.value || '0'
  const otherDescribeCAddition = (document.getElementById('otherDescribeCAddition') as HTMLInputElement)?.value || '0'
  const btyMass = matchBatteryWeight(otherDescribeCAddition)
  const expectedNetWeight = fixFloatPrecision((Number(btyCount) * btyMass) / 1000)
  const calculationText = `${btyCount} * ${btyMass}g = ${expectedNetWeight}kg`
  const display = document.getElementById('calculatorDisplay')
  if (!display) return
  display.innerHTML = calculationText
  const btyNetWeight = Number((document.getElementById(inputName) as HTMLInputElement)?.value || '0')
  const abs = Math.abs(
    (expectedNetWeight - btyNetWeight) / btyNetWeight
  )
  markErrorElement(inputName, abs > 0.05 ? [calculationText] : [])
}

export function insertWattCalculationText(systemId: string) {
  // 如果已存在则跳过，保证幂等性
  if (document.getElementById('wattCalculatorDisplay')) return

  // 注入高亮数字的样式（仅首次）
  if (!document.getElementById('calc-highlight-style')) {
    const style = document.createElement('style')
    style.id = 'calc-highlight-style'
    style.textContent = '.calc-highlight { color: #FF6347; font-weight: 700; }'
    document.head.appendChild(style)
  }

  // 根据 systemId 选择目标输入元素: sek → btyNetWeight, pek → netWeight
  const inputId = systemId === 'PEKGZ' ? 'inspectionItem3Text1' : 'inspectionItem1Text2'
  const input = document.getElementsByName(inputId)[0]
  if (!input) return

  // 从输入框向上找到外层 <span>（textbox 的父元素），在 "Wh" 之后追加计算过程文本
  const outerSpan = input.parentElement!.parentElement!
  const display = document.createElement('span')
  display.id = 'wattCalculatorDisplay'
  display.textContent = ''
  display.style.paddingLeft = '8px'
  outerSpan.appendChild(display)
  updateWattCalculationText(systemId)
}

// 更新计算过程文本
export function updateWattCalculationText(systemId: string) {
  const itemCName = (document.getElementById("itemCName") as HTMLInputElement)?.value || ''
  // 电压
  const voltage = matchVoltage(itemCName)
  // 容量
  const capacity = matchCapacity(itemCName)
  // 瓦时
  const wattHourInputName = systemId === 'PEKGZ' ? 'inspectionItem3Text1' : 'inspectionItem1Text1'
  const wattHourString = (document.getElementsByName(wattHourInputName)[0] as HTMLInputElement)?.value
  if (!wattHourString) return
  const wattHour = matchNumber(wattHourString || '0')

  const expectedWattHour = fixFloatPrecision((Number(voltage) * capacity) / 1000)
  const abs = Math.abs(
    (expectedWattHour - wattHour) / wattHour
  )
  const calculationText = `${voltage}V * ${capacity}mAh = ${expectedWattHour}Wh &nbsp;&nbsp;&nbsp;${abs > 0 ? abs : ''}`
  const display = document.getElementById('wattCalculatorDisplay')
  if (!display) return
  display.innerHTML = calculationText

  markErrorElement(wattHourInputName, abs > 0 ? [calculationText] : [])
}
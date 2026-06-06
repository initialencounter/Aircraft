import { matchBatteryWeight } from "../../../../validators/src/lithium/shared/utils"

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
  const inputId = systemId === 'PEKGZ' ? 'netWeight' : 'btyNetWeight'
  const input = document.getElementById(inputId)
  if (!input) return

  // 从输入框向上找到外层 <span>（textbox 的父元素），在 "kg" 之后追加计算过程文本
  const outerSpan = input.parentElement!.parentElement!
  const display = document.createElement('span')
  display.id = 'calculatorDisplay'
  display.textContent = ''
  display.style.paddingLeft = '8px'
  outerSpan.appendChild(display)
}


// 更新计算过程文本
export function updateCalculationText() {
  const btyCount = (document.getElementById('btyCount') as HTMLInputElement)?.value || '0'
  const otherDescribeCAddition = (document.getElementById('otherDescribeCAddition') as HTMLInputElement)?.value || '0'
  const btyMass = matchBatteryWeight(otherDescribeCAddition)
  const expectedNetWeight = (Number(btyCount) * btyMass) / 1000
  const calculationText = `${btyCount} * ${btyMass}g = ${expectedNetWeight}kg`
  const display = document.getElementById('calculatorDisplay')
  if (!display) return
  display.innerHTML = calculationText
}

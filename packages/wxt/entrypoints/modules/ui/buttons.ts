import { isInspectPage } from '../utils/helpers'
import type { LocalConfig } from '../../../share/utils'

/**
 * 创建验证按钮
 */
export function createVerifyButtons(
  verifyCallback: () => void,
  localConfig: typeof LocalConfig
): void {
  const targetChild = document.getElementById('openDocumentsBtn0')
  if (!targetChild) return

  const targetParent = targetChild.parentElement
  if (!targetParent) return

  // 创建第一个验证按钮
  const verifyButton = createButton('lims-verifyButton', verifyCallback)

  // 创建第二个验证按钮
  const verifyButton2 = createButton('lims-verifyButton2', verifyCallback)

  // 获取目标元素
  const targetChild2 = document.getElementById('importBtn')
  if (!targetChild2) return

  const targetParent2 = targetChild2.parentElement
  if (!targetParent2) return

  targetParent2.appendChild(verifyButton2)

  // 定位按钮
  const submit = document.getElementById('submitBtn0')
  const submit2 = document.getElementById('submitBtn')

  if (isInspectPage() && submit && localConfig.verifyButtonOnMiddle === true) {
    targetParent.insertBefore(verifyButton, submit)
    targetParent2.insertBefore(verifyButton2, submit2)
  } else {
    targetParent.appendChild(verifyButton)
    targetParent2.appendChild(verifyButton2)
  }

  console.log('验证按钮插入成功！')
}

/**
 * 创建单个按钮
 */
function createButton(
  id: string,
  clickCallback: () => void
): HTMLAnchorElement {
  const button = document.createElement('a')
  button.id = id
  button.href = 'javascript:void(0);'
  button.className = 'easyui-linkbutton l-btn l-btn-small'
  button.style.background = '#ffffff'
  button.style.width = '52px'

  // 添加悬停效果
  button.onmouseover = function () {
    button.style.background = '#54a124'
  }
  button.onmouseout = function () {
    button.style.background = '#ffffff'
  }

  button.innerHTML = `
    <span id='lims-verifyButton-icon' class='l-btn-left l-btn-icon-left'>
      <span class='l-btn-text'>验证</span>
      <svg class='l-btn-icon' xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 -960 960 960' width='24px' fill='#bbbbbb'><path d='m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm34-102 102-44 104 44 56-96 110-26-10-112 74-84-74-86 10-112-110-24-58-96-102 44-104-44-56 96-110 24 10 112-74 86 74 84-10 114 110 24 58 96Zm102-318Zm-42 142 226-226-56-58-170 170-86-84-56 56 142 142Z'/></svg>
    </span>
  `

  button.onclick = clickCallback
  return button
}

/**
 * 更新验证按钮状态
 */
export function updateVerifyButtonStatus(color: string): void {
  const verifyButton = document.getElementById('lims-verifyButton')?.children[0]
    ?.children[1] as SVGAElement
  const verifyButton2 = document.getElementById('lims-verifyButton2')
    ?.children[0]?.children[1] as SVGAElement

  if (verifyButton) verifyButton.setAttribute('fill', color)
  if (verifyButton2) verifyButton2.setAttribute('fill', color)
}

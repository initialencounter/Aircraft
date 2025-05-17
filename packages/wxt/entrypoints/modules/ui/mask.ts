/**
 * 创建遮罩层
 */
export function createMask(): void {
  const mask = document.createElement('div')
  mask.id = 'upload-mask'
  mask.style.position = 'fixed'
  mask.style.top = '0'
  mask.style.left = '0'
  mask.style.width = '100%'
  mask.style.height = '100%'
  mask.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  mask.style.zIndex = '9999'
  mask.style.display = 'none'
  document.body.appendChild(mask)
}

/**
 * 显示遮罩层
 */
export function showMask(): void {
  const mask = document.getElementById('upload-mask')
  if (mask) {
    mask.style.display = 'block'
  }
}

/**
 * 隐藏遮罩层
 */
export function hideMask(): void {
  const mask = document.getElementById('upload-mask')
  if (mask) {
    mask.style.display = 'none'
  }
}

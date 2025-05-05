import { LABEL_IMG } from '../../share/label'
import type { LocalConfig } from '@/share/utils'

/**
 * 创建标签选择UI
 */
export function createLabelSelectionUI(localConfig: typeof LocalConfig): void {
  console.log('localConfig3', JSON.stringify(localConfig, null, 2))
  console.log('localConfig:', localConfig, 'localConfig.enableLabelCheckManual',localConfig.enableLabelCheckManual)
  if (!(localConfig.enableLabelCheckManual)) return
  const LABELS = ['lims-verify-label-9', 'lims-verify-label-9A', 'lims-verify-label-CAO', 'lims-verify-label-bty']
  const panel = document.querySelector('body > div.panel.easyui-fluid > div.easyui-panel.panel-body > div') as HTMLDivElement
  
  if (!panel) return
  
  let imagePosition = document.querySelector('#batteryInspectForm > div > div:nth-child(5) > table')
  if (!imagePosition) return
  
  const container = document.createElement('div')
  Object.assign(container.style, {
    id: 'lims-verify-label-container',
    width: 'auto',
    height: 'auto',
    display: 'flex',
    'flex-direction': 'row',
    position: 'absolute',
  })
  
  let y = imagePosition.getBoundingClientRect().y
  container.style.top = y + 'px'
  
  // 动态调整位置
  setInterval(() => {
    let width = imagePosition.getBoundingClientRect().width
    let x = imagePosition.getBoundingClientRect().x + width - container.getBoundingClientRect().width
    container.style.left = x + 'px'
  }, 200)

  // 添加标签选择图片
  for (let i = 0; i < 4; i++) {
    container.appendChild(createImageItem(i, LABELS))
  }
  
  document.body.appendChild(container)
}

/**
 * 创建单个图片项
 */
function createImageItem(num: number, LABELS: string[]): HTMLImageElement {
  const img = document.createElement('img')
  Object.assign(img.style, {
    id: LABELS[num],
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    cursor: 'pointer',
    opacity: '0.5',
    transition: 'all 0.3s',
    margin: '5px',
    border: '5px solid transparent' // 初始时设置透明边框
  })
  
  img.src = LABEL_IMG[num]
  img.dataset.selected = 'false'
  img.dataset.id = LABELS[num]

  img.addEventListener('click', function () {
    const isSelected = this.dataset.selected === 'true'
    this.dataset.selected = String(!isSelected)
    this.style.opacity = isSelected ? '0.5' : '1'
    // 选中时添加绿色边框，未选中时恢复透明边框
    this.style.border = isSelected ? '5px solid transparent' : '5px solid green'
  })

  return img
}

import { waitForElement } from '../../../share/utils'
import { getCurrentProjectNo } from '../utils/helpers'
import { checklistItems, type ChecklistItem } from './items'

const STORAGE_KEY = 'limsChecklist'
const PANEL_ID = 'lims-checklist'
const STYLE_ID = 'lims-checklist-style'

interface SavedState {
  projectNo: string
  checked: string[]
  updatedAt: number
}

/**
 * 在检验单页面挂载检查单面板
 */
export async function mountChecklistPanel(): Promise<void> {
  if (!getCurrentProjectNo()) {
    try {
      await waitForElement('#projectNo')
    } catch {
      return
    }
  }

  const projectNo = getCurrentProjectNo()
  if (!projectNo) return
  if (document.getElementById(PANEL_ID)) return

  const items = checklistItems
  const validIds = new Set(items.map((item) => item.id))
  const checked = new Set(await loadChecked(projectNo, validIds))

  ensureStyle()
  document.body.appendChild(buildPanel(projectNo, items, checked))
}

async function loadChecked(projectNo: string, validIds: Set<string>): Promise<string[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const saved = result[STORAGE_KEY] as SavedState | undefined
  if (!saved || saved.projectNo !== projectNo || !Array.isArray(saved.checked)) return []
  return saved.checked.filter((id) => validIds.has(id))
}

function saveChecked(projectNo: string, checked: Set<string>): void {
  const state: SavedState = {
    projectNo,
    checked: [...checked],
    updatedAt: Date.now(),
  }
  chrome.storage.local.set({ [STORAGE_KEY]: state })
}

function buildPanel(
  projectNo: string,
  items: ChecklistItem[],
  checked: Set<string>
): HTMLElement {
  const panel = document.createElement('div')
  panel.id = PANEL_ID

  // 头部
  const header = document.createElement('div')
  header.className = 'lc-header'
  const title = document.createElement('span')
  title.textContent = '检查单'
  const count = document.createElement('span')
  count.className = 'lc-count'
  header.append(title, count)
  header.addEventListener('click', () => {
    panel.classList.toggle('lc-collapsed')
  })

  // 条目
  const body = document.createElement('div')
  body.className = 'lc-body'
  let currentSection = ''
  const boxes = new Map<string, HTMLInputElement>()

  for (const item of items) {
    if (item.section !== currentSection) {
      currentSection = item.section
      const section = document.createElement('div')
      section.className = 'lc-section'
      section.textContent = currentSection
      body.appendChild(section)
    }

    const row = document.createElement('div')
    row.className = 'lc-item'

    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = checked.has(item.id)
    box.addEventListener('change', () => {
      if (box.checked) {
        checked.add(item.id)
        row.classList.add('lc-checked')
      } else {
        checked.delete(item.id)
        row.classList.remove('lc-checked')
      }
      updateCount()
      saveChecked(projectNo, checked)
    })
    boxes.set(item.id, box)

    const label = document.createElement('span')
    label.textContent = item.label
    if (item.field) {
      label.dataset.field = item.field
      label.title = '点击定位到表单字段'
      label.addEventListener('click', () => focusField(item.field!))
    }

    if (box.checked) row.classList.add('lc-checked')
    row.append(box, label)
    body.appendChild(row)
  }

  // 底部
  const footer = document.createElement('div')
  footer.className = 'lc-footer'
  const reset = document.createElement('a')
  reset.textContent = '重置'
  reset.addEventListener('click', () => {
    if (!window.confirm('重置本单检查进度？')) return
    checked.clear()
    boxes.forEach((box) => {
      box.checked = false
      box.closest('.lc-item')?.classList.remove('lc-checked')
    })
    updateCount()
    saveChecked(projectNo, checked)
  })
  footer.appendChild(reset)

  panel.append(header, body, footer)

  function updateCount() {
    count.textContent = `${checked.size}/${items.length}`
    panel.classList.toggle('lc-done', checked.size === items.length)
  }
  updateCount()

  return panel
}

function focusField(field: string): void {
  const element = document.getElementsByName(field)[0] as HTMLElement | undefined
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element.focus()
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    #${PANEL_ID} {
      position: fixed; top: 12px; right: 12px; width: 210px; z-index: 999999;
      background: #fff; border: 1px solid #c9c9c9; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .15); color: #333;
      font: 12px/1.5 "Microsoft YaHei", sans-serif;
    }
    #${PANEL_ID} .lc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 8px; background: #f5f5f5; border-bottom: 1px solid #ddd;
      cursor: pointer; user-select: none; font-weight: 700;
    }
    #${PANEL_ID}.lc-done .lc-header {
      background: #54a124; color: #fff; border-bottom-color: #54a124;
    }
    #${PANEL_ID} .lc-body { max-height: 60vh; overflow-y: auto; padding: 4px 0; }
    #${PANEL_ID}.lc-collapsed .lc-body,
    #${PANEL_ID}.lc-collapsed .lc-footer { display: none; }
    #${PANEL_ID} .lc-section { padding: 4px 8px 2px; color: #999; font-size: 11px; }
    #${PANEL_ID} .lc-item { display: flex; align-items: flex-start; gap: 6px; padding: 3px 8px; }
    #${PANEL_ID} .lc-item:hover { background: #f0f7eb; }
    #${PANEL_ID} .lc-item input { margin: 2px 0 0; accent-color: #54a124; }
    #${PANEL_ID} .lc-item span { flex: 1; word-break: break-all; }
    #${PANEL_ID} .lc-item.lc-checked span { color: #aaa; text-decoration: line-through; }
    #${PANEL_ID} .lc-item span[data-field] { cursor: pointer; }
    #${PANEL_ID} .lc-item span[data-field]:hover { color: #54a124; text-decoration: underline; }
    #${PANEL_ID} .lc-footer {
      display: flex; justify-content: space-between; padding: 4px 8px;
      border-top: 1px solid #eee; color: #888;
    }
    #${PANEL_ID} .lc-footer a { color: #888; cursor: pointer; }
  `
  document.head.appendChild(style)
}

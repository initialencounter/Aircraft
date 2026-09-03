import { waitForElement } from '../share/utils'
import { diffChars } from 'diff'
import { ConsoleLogger } from './modules/utils/logger'

const ASSIGNEE_SELECTOR = [
  "#page1 > table > tbody > tr:nth-child(6) > td:nth-child(3) > span",
  "#page1 > table > tbody > tr:nth-child(7) > td:nth-child(3) > span",
]

const MANUFACTURER_SELECTOR = [
  "#page1 > table > tbody > tr:nth-child(13) > td:nth-child(4) > span",
  "#page1 > table > tbody > tr:nth-child(14) > td:nth-child(3) > span",
]

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/page/html/*',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  const logger = new ConsoleLogger({
    prefix: '[Assigneediff Entrypoint]',
    showTimestamp: true,
    enabled: true,
    level: 'trace',
  });
  await waitForElement(MANUFACTURER_SELECTOR[0])
  chrome.storage.local.get(['assigneeDiff'], async (localConfig) => {
    if (localConfig.assigneeDiff !== false) {
      logger.log("assigneeDiff is running")
      await setupDiff()
    } else {
      logger.log("assigneeDiff not running")
    }
  })


  async function setupDiff() {
    const titleElement = await waitForElement("#page1 > table > tbody > tr:nth-child(5) > td:nth-child(2) > span") as HTMLSpanElement
    if (!titleElement || !titleElement.innerHTML?.includes("运 输 危 险 性 鉴 别 委 托 书")) {
      return
    }
    const assignee = getCompany(ASSIGNEE_SELECTOR[0], ASSIGNEE_SELECTOR[1])
    const manufacturer = getCompany(MANUFACTURER_SELECTOR[0], MANUFACTURER_SELECTOR[1])

    const cDiff = diffChars(assignee.cName, manufacturer.cName)
    const eDiff = diffChars(assignee.eName, manufacturer.eName)

    renderDiff(ASSIGNEE_SELECTOR[0], cDiff, 'assignee')
    renderDiff(ASSIGNEE_SELECTOR[1], eDiff, 'assignee')
    renderDiff(MANUFACTURER_SELECTOR[0], cDiff, 'manufacturer')
    renderDiff(MANUFACTURER_SELECTOR[1], eDiff, 'manufacturer')
  }

  function renderDiff(selector: string, diff: Array<{ value: string, added?: boolean, removed?: boolean }>, side: 'assignee' | 'manufacturer') {
    const el = document.querySelector(selector)
    if (!el) return

    let html = ''
    for (const part of diff) {
      // 只在各自单元格里渲染属于自己那一版的内容
      if (part.removed && side === 'manufacturer') continue
      if (part.added && side === 'assignee') continue

      const isSame = !part.added && !part.removed
      const color = isSame ? '#ccffcc' : '#ffcccc'
      html += `<span style="background-color: ${color}">${part.value}</span>`
    }
    el.innerHTML = html
  }

  function getCompany(cNameSelector: string, eNameSelector: string): { cName: string, eName: string } {
    const company = {
      cName: '',
      eName: ''
    }
    const cnameElement = document.querySelector(cNameSelector)
    if (cnameElement) {
      company.cName = cnameElement.innerHTML
    }

    const eNameElement = document.querySelector(eNameSelector)
    if (eNameElement) {
      company.eName = eNameElement.innerHTML
    }
    return company
  }
}

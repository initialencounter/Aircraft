import { sleep, waitForElement } from '../share/utils'

interface Customer {
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
  id: string
  code: string
  cname: string
  ename: string
  type: number
  bankAccount: string | null
  status: number
  companyId: string
  owner: string
  certified: boolean
  companyName: string
  createdByName: string
  modifiedByName: string
  ownerName: string
}

interface CustomerResponse {
  total: number
  rows: Customer[]
}

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/sales/entrust/main',
    'https://*/sales/entrust/edit*',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  let searchText = ''
  chrome.storage.local.get('enableDisplayEntrustEName', async (data) => {
    if (data.enableDisplayEntrustEName === false) return
    console.log('启用委托方英文名称显示')
    try {
      addEnameColumn()
      debounceInput()

      // 特殊处理, 展开搜索结果后需要重新加宽列表
      const expandElement = await waitForElement("#entrustEditForm > table > tbody > tr:nth-child(2) > td:nth-child(2) > div:nth-child(4) > span > span > a") as HTMLAnchorElement | null
      expandElement?.addEventListener('click', async () => {
        console.log('点击查询按钮')
        await sleep(200)
        expandTable(800)
      })
    } catch (error) {
      console.error('初始化失败:', error)
    }
  })



  async function getEntrustEName(entrustName: string): Promise<Customer[]> {
    try {
      const url = new URL(
        `https://${window.location.host}/rest/customer/customers`
      )
      url.searchParams.set('name', entrustName)
      url.searchParams.set('page', '1')
      url.searchParams.set('rows', '100')

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: CustomerResponse = await response.json()
      return data.rows
    } catch (error) {
      console.error('获取委托方英文名称失败:', error)
      return []
    }
  }

  async function insertEntrustEname(customerList: Customer[]) {
    if (!customerList.length) return

    const customerMap = new Map(
      customerList.map((customer) => [customer.cname, customer.ename])
    )

    const getRowElement = (index: number, column: number): HTMLElement | null =>
      document.querySelector(
        `#datagrid-row-r1-2-${index} > td:nth-child(${column}) > div`
      )

    for (let i = 0; i < 10; i++) {
      const cnameElement = getRowElement(i, 1)
      const enameElement = getRowElement(i, 2)

      if (!cnameElement || !enameElement) continue

      const parentElement = enameElement.parentElement?.parentElement
      if (!parentElement) continue
      const matchingEname = customerMap.get(cnameElement.innerHTML)
      if (matchingEname !== undefined) {
        const realEnameElement = document.createElement('td')
        realEnameElement.innerHTML = `<div class='datagrid-cell' style='width: 400px;'>${matchingEname || '/'}</div>`
        realEnameElement.setAttribute('field', 'customerEName')
        parentElement.appendChild(realEnameElement)
      }
    }
  }

  async function expandTable(width: number) {
    await waitForElement('body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table > tbody')
    const selectors = {
      width: [
        'body > div:nth-child(10)',
        'body > div:nth-child(10) > div',
        'body > div:nth-child(10) > div > div',
        'body > div:nth-child(10) > div > div > div',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-header',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table > tbody',
      ],
      height: {
        'body > div:nth-child(10) > div': 450,
        'body > div:nth-child(10) > div > div > div': 450,
        'body > div:nth-child(10) > div > div > div > div.datagrid-view': 420,
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body': 390,
      },
    }

    // 设置高度
    Object.entries(selectors.height).forEach(([selector, height]) => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        Object.assign(element.style, {
          height: `${height}px`,
          maxHeight: 'none',
        })
      }
    })

    // 设置宽度
    selectors.width.forEach((selector) => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        Object.assign(element.style, {
          width: `${width}px`,
          maxWidth: 'none',
        })
      }
    })
  }

  async function addEnameColumn() {
    const headerRow = await waitForElement(
      'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-header > div > table > tbody > tr'
    ) as HTMLTableRowElement | null
    if (headerRow) {
      const newHeader = document.createElement('td')
      newHeader.innerHTML = `<div class='datagrid-cell' style='width: 400px;'><span>客户英文名称</span></div>`
      headerRow.appendChild(newHeader)
    }

    for (let i = 0; i < 10; i++) {
      const row = document.querySelector(`#datagrid-row-r1-2-${i}`)
      if (row) {
        const newCell = document.createElement('td')
        newCell.innerHTML = `<div class='datagrid-cell' style='width: 400px;'></div>`
        row.appendChild(newCell)
      }
    }
  }

  async function debounceInput() {
    const input = await waitForElement(
      '#entrustEditForm > table > tbody > tr:nth-child(2) > td:nth-child(2) > div:nth-child(4) > span > input.textbox-text.validatebox-text'
    ) as HTMLInputElement | null
    if (!input) {
      console.warn('未找到输入元素')
      return
    }

    // 跟踪搜索文本（仅记录，不直接触发英文名插入）
    input.addEventListener('input', (e) => {
      searchText = (e.target as HTMLInputElement).value
    })

    // 使用 MutationObserver 监听 combogrid 下拉面板中 datagrid 行数据的渲染完成
    // 这样可以确保在中文名称加载完成后再插入英文名称
    let datagridLoadTimer: NodeJS.Timeout
    let isProcessing = false

    let pendingRetry = false

    const handleDatagridDataLoaded = async () => {
      const currentSearch = searchText
      if (!currentSearch) return

      // 如果正在处理中，标记需要重试，避免遗漏数据加载事件
      if (isProcessing) {
        pendingRetry = true
        return
      }

      isProcessing = true
      pendingRetry = false
      try {
        const customers = await getEntrustEName(currentSearch)
        await insertEntrustEname(customers)
        expandTable(800)
      } catch (error) {
        console.error('处理数据加载时发生错误:', error)
      } finally {
        isProcessing = false
        // 如果在处理期间有新数据加载，立即重试
        if (pendingRetry) {
          pendingRetry = false
          clearTimeout(datagridLoadTimer)
          datagridLoadTimer = setTimeout(handleDatagridDataLoaded, 100)
        }
      }
    }

    const bodyObserver = new MutationObserver((mutations) => {
      let hasRowChanges = false

      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue

        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          // 检测 combogrid 面板中新增的 datagrid 行
          if (
            (node.matches?.('tr.datagrid-row') && node.closest?.('.combo-p')) ||
            node.querySelector?.('.combo-p tr.datagrid-row')
          ) {
            hasRowChanges = true
            break
          }
        }

        if (hasRowChanges) break
      }

      if (!hasRowChanges) return

      clearTimeout(datagridLoadTimer)
      datagridLoadTimer = setTimeout(handleDatagridDataLoaded, 200)
    })

    // 监听 document.body 的子节点变化，捕获 combogrid 面板中行的增删
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
    console.log('已设置 combogrid 数据加载监听器')
  }
}

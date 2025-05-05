import { sleep } from '../share/utils'

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
  matches: ['https://*/sales/entrust/main'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  await sleep(500)
  let searchText = ''
  chrome.storage.local.get('enableDisplayEntrustEName', async (data) => {
    if (data.enableDisplayEntrustEName === false) return
    console.log('启用委托方英文名称显示')
    try {
      await sleep(500)
      addEnameColumn()
      debounceInput()
      setPage()
      expandTable(700)
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

  function expandTable(width: number) {
    const selectors = {
      width: [
        'body > div:nth-child(10)',
        'body > div:nth-child(10) > div',
        'body > div:nth-child(10) > div > div',
        'body > div:nth-child(10) > div > div > div',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view',
        'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2',
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

  function addEnameColumn() {
    const headerRow = document.querySelector(
      'body > div:nth-child(10) > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-header > div > table > tbody > tr'
    )
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

  function debounceInput(delay: number = 500) {
    const input = document.querySelector<HTMLInputElement>(
      '#entrustEditForm > table > tbody > tr:nth-child(2) > td:nth-child(2) > div:nth-child(4) > span > input.textbox-text.validatebox-text'
    )
    if (!input) {
      console.warn('未找到输入元素')
      return
    }

    let timer: NodeJS.Timeout

    const handleInput = async (value: string) => {
      try {
        expandTable(800)
        searchText = value
        const customers = await getEntrustEName(searchText)
        await insertEntrustEname(customers)
        expandTable(800)
      } catch (error) {
        console.error('处理输入时发生错误:', error)
      }
    }

    input.addEventListener('input', (e) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        handleInput((e.target as HTMLInputElement).value)
      }, delay)
    })
  }

  function setPage() {
    const nextPage = document.querySelector(
      'body > div:nth-child(10) > div > div > div > div.datagrid-pager.pagination > table > tbody > tr > td:nth-child(10) > a'
    ) as HTMLAnchorElement
    if (nextPage) {
      nextPage.addEventListener('click', async () => {
        expandTable(700)
        const name: Customer[] = await getEntrustEName(searchText)
        await insertEntrustEname(name)
        expandTable(700)
      })
    }
  }
}

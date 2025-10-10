import { parseDate, sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'

interface Task {
  assignee: string
  attchmentFiles: string[]
  backId: null
  category: string
  comment: null
  companyName: string
  completeTime: null
  completeUser: null
  createTime: number
  entrustId: string
  freezed: boolean
  id: string
  itemCName: string
  itemSendSample: number
  nextYear: boolean
  parallel: boolean
  projectDate: number
  projectId: string
  projectNo: string
  serviceType: number
  submitDate: string
  submitUser: string
  submitUserName: string
  systemId: string
  taskName: string
}

interface User {
  userId: string
  userName: string
}

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/sales/entrust/list'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  const Qmsg = getQmsg()
  let globalAssignUser = ''
  let globalCheckAssignUser = true
  let hiddenTimeEntrustList: number | null = null
  
  // 缓存 DOM 元素引用和数据
  const domCache = new Map<string, Element | null>()
  const dataCache = new Map<string, any>()
  
  // 防抖函数
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | undefined
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => func(...args), delay)
    }
  }

  // 节流函数
  function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastExecTime = 0
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastExecTime >= delay) {
        lastExecTime = now
        func(...args)
      }
    }
  }

  chrome.storage.local.get(
    [
      'assignUser',
      'nextYearColor',
      'nextYearBgColor',
      'onekeyAssign',
      'checkAssignUser',
      'showInspectFormLink',
      'freshHotkey',
      'autoRefreshDuration',
    ],
    async function (data) {
      if (!(data.freshHotkey === false)) {
        listenFreshHotkeyEntrustList()
        listenVisibilityChangeEntrustList(data?.autoRefreshDuration ?? 10000)
      }
      const assignUser = data.assignUser as string
      globalAssignUser = assignUser
      globalCheckAssignUser = data.checkAssignUser !== false
      console.log('一键分配脚本运行中...', data)
      if (!(data.onekeyAssign === false)) await insertElement(assignUser)
      if (!(data.showInspectFormLink === false)) observeItemNumberList1()
      // 设置下一年报告颜色
      removeOrange(data.nextYearColor ?? '', data.nextYearBgColor ?? '#76EEC6')
    }
  )

  // function

  function getIds(): string[] {
    const checkboxes = document.querySelectorAll(
      'input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>
    const filteredCheckboxes = Array.from(checkboxes).filter(
      function (checkbox) {
        return checkbox.checked
      }
    )
    return filteredCheckboxes.map(function (checkbox) {
      return checkbox.value
    })
  }

  async function checkAssignUID(users: User[], uid: string): Promise<boolean> {
    if (!uid || !users.length) return false
    // 使用 some 方法提高查找性能
    return users.some(user => user.userId === uid)
  }

  async function getUsers(): Promise<User[]> {
    // 添加缓存机制，避免重复请求
    const cacheKey = 'users_cache'
    const cached = dataCache.get(cacheKey) as { data: User[], timestamp: number } | null
    const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      const response = await fetch(
        `https://${window.location.host}/rest/flow/task/users/inspect`
      )
      if (!response.ok) return []
      
      const users = await response.json()
      dataCache.set(cacheKey, { data: users, timestamp: Date.now() })
      return users
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return []
    }
  }

  async function assignSelectId(uid: string) {
    if (uid === '2c91808478367c2801788230b248470e' && globalCheckAssignUser) {
      const res = confirm('确定主检员是正确的吗？')
      if (!res) return
    }
    const ids = getIds()
    if (!ids.length) return
    console.log('assignSelectId:', ids)
    const receiveIds = await ReceiveSubmit(ids, 'receive')
    if (!receiveIds.length) return
    console.log('receiveIds:', receiveIds)
    const submitIds = await ReceiveSubmit(receiveIds, 'submit')
    if (!submitIds.length) return
    console.log('submitIds:', submitIds)
    const taskIds = await getTaskIds(submitIds)
    if (!taskIds) return
    console.log('taskIds:', taskIds)
    await assignTask(taskIds, uid)
    doFreshEntrustList()
  }

  async function ReceiveSubmit(
    ids: string[],
    task: 'receive' | 'submit'
  ): Promise<string[]> {
    if (!ids.length) return []
    await sleep(50)
    const response = await fetch(
      `https://${window.location.host}/rest/sales/entrust/entrusts/${task}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(ids),
      }
    )
    if (!response.ok) {
      console.error('receive failed')
      return []
    }
    const data = await response.json()
    return data['result']
  }

  async function getTaskIds(ids: string[]): Promise<string[]> {
    if (!ids.length) return []
    await sleep(50)
    const currentDate = new Date()
    const date = currentDate.toISOString().split('T')[0]
    currentDate.setMonth(currentDate.getMonth() - 1)
    const startDate = currentDate.toISOString().split('T')[0]
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/get/assignInspect?projectStartDate=${startDate}&projectEndDate=${date}&projectState=0&page=1&rows=10`,
      {
        method: 'GET',
        credentials: 'include', // 包含 cookies
      }
    )
    if (!response.ok) {
      console.error('get task ids failed')
      return []
    }
    const data = await response.json()
    // 使用 Set 提高查找性能，避免嵌套循环
    const idsSet = new Set(ids)
    return data['rows']
      .filter((row: Task) => idsSet.has(row['entrustId']))
      .map((item: Task) => item.id)
  }

  async function assignTask(taskIds: string[], uid: string) {
    if (!taskIds.length) return
    if (!uid) return
    const body = {
      userId: uid,
      taskIds: taskIds,
    }
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/do/assignInspect`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(body),
      }
    )
    if (!response.ok) {
      console.error('assign task failed1')
      return
    }
    const result = await response.json()
    if (result['result'] === 'success') {
      Qmsg['success']('分配成功')
    } else {
      console.error('assign task failed2')
      Qmsg['error']('分配失败')
    }
  }

  async function insertElement(uid: string) {
    await sleep(200)
    const targetParent = document.getElementById('toolbar')
    if (!targetParent) return
    const div = document.createElement('div')
    div.style.display = 'flex'
    div.style.gap = '4px'
    // button
    const assignButton = document.createElement('a')
    assignButton.href = 'javascript:void(0);'
    assignButton.className = 'easyui-linkbutton l-btn l-btn-small'
    assignButton.dataset.options = 'width:120'
    assignButton.style.width = '118.4px'
    assignButton.innerHTML = `
  <span class='l-btn-left' style='margin-top: 0px;'>
    <span class='l-btn-text'>一键分配给：</span>
  </span>
  `
    assignButton.onclick = lims_onekey_assign_click

    // select
    const select = document.createElement('select')
    select.id = 'lims_onekey_assign_user'
    select.style.width = '120px'
    select.style.height = '26px'
    select.style.border = '1px solid #bbb'
    select.style.background =
      'linear-gradient(to bottom,#ffffff 0,#e6e6e6 100%)'
    select.className = 'easyui-linkbutton l-btn l-btn-small'
    select.setAttribute('textboxname', 'systemId')
    select.setAttribute('comboname', 'systemId')
    const users = await getUsers()
    users.forEach(function (user) {
      const option = document.createElement('option')
      option.value = user.userId
      option.innerText = user.userName
      select.appendChild(option)
    })
    if (await checkAssignUID(users, uid)) select.value = uid
    const button1 = targetParent.children[1].children[0]; // 初验按钮
    for (let i = 0; i < targetParent.children[1].children.length; i++) {
      const buttonText = (targetParent.children[1].children[i] as HTMLAnchorElement).innerText
      if (['自定义收费', '批量打印样品标签', '批量接收样品'].includes(buttonText)) {
        (targetParent.children[1].children[i] as HTMLAnchorElement).style.width = '0';
        (targetParent.children[1].children[i] as HTMLAnchorElement).style.height = '0';
      }
    }
    targetParent.children[1].insertBefore(assignButton, button1)
    targetParent.children[1].insertBefore(select, button1)
    console.log('一键分配按钮插入成功')
  }

  async function lims_onekey_assign_click() {
    const select = document.getElementById(
      'lims_onekey_assign_user'
    ) as HTMLSelectElement
    const selectUid = select.value
    if (!selectUid) return
    if (globalAssignUser !== selectUid) {
      chrome.storage.local.set({ assignUser: selectUid })
      globalAssignUser = selectUid
    }
    await assignSelectId(selectUid)
  }

  function removeOrange(nextYearColor: string, nextYearBgColor: string) {
    // 使用 MutationObserver 替代轮询，性能更好
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          shouldUpdate = true
        }
      })
      
      if (shouldUpdate) {
        updateOrangeColors(nextYearColor || '', nextYearBgColor || '#76EEC6')
      }
    })

    // 观察数据网格的变化
    const gridContainer = document.querySelector('#datagrid-row-r1-1-0')?.parentElement
    if (gridContainer) {
      observer.observe(gridContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      })
    }

    // 初始执行一次
    updateOrangeColors(nextYearColor || '', nextYearBgColor || '#76EEC6')
  }

  function updateOrangeColors(nextYearColor: string, nextYearBgColor: string) {
    // 使用 requestAnimationFrame 优化 DOM 更新性能
    requestAnimationFrame(() => {
      // 批量查询所有相关元素，减少DOM查询次数
      const rows1 = document.querySelectorAll('[id^="datagrid-row-r1-1-"]') as NodeListOf<HTMLElement>
      const rows2 = document.querySelectorAll('[id^="datagrid-row-r1-2-"]') as NodeListOf<HTMLElement>
      
      for (let i = 0; i < Math.min(rows1.length, rows2.length); i++) {
        const target1 = rows1[i]
        const target2 = rows2[i]
        
        if (target1?.style.color === 'orange') {
          target1.style.color = nextYearColor
          target1.style.backgroundColor = nextYearBgColor
        }
        
        if (target2?.style.color === 'orange') {
          target2.style.color = nextYearColor
          target2.style.backgroundColor = nextYearBgColor
        }
      }
    })
  }

  let globalItemNumberList1: string[] = []
  let processedRows = new Set<number>() // 记录已处理的行，避免重复处理

  async function insertInspectFormLink(length1: number) {
    // 批量处理，减少DOM查询
    const rowsToProcess = []
    for (let i = 0; i < length1; i++) {
      if (processedRows.has(i)) continue // 跳过已处理的行
      
      const projectNo = globalItemNumberList1[i]
      if (!projectNo) continue
      
      rowsToProcess.push({ index: i, projectNo })
    }

    // 批量查询DOM元素
    const itemCNameElements = rowsToProcess.map(row => 
      document.querySelector(`#datagrid-row-r1-2-${row.index} > td:nth-child(3) > div`) as HTMLDivElement
    )
    const operateElements = rowsToProcess.map(row => 
      document.querySelector(`#datagrid-row-r1-2-${row.index} > td:nth-child(14) > div`) as HTMLAnchorElement
    )

    for (let j = 0; j < rowsToProcess.length; j++) {
      const { index: i, projectNo } = rowsToProcess[j]
      const itemCNameElement = itemCNameElements[j]
      const operateElement = operateElements[j]

      if (!itemCNameElement || itemCNameElement.innerHTML === '') {
        continue
      }

      // 处理操作列的检验单链接
      if (operateElement && !operateElement.innerHTML.includes('检验单')) {
        const inspectElement = document.createElement('a')
        inspectElement.role = 'button'
        inspectElement.innerHTML = '检验单'
        inspectElement.onclick = () => openWindow(projectNo)
        inspectElement.style.cursor = 'pointer'
        operateElement.appendChild(document.createTextNode(' '))
        operateElement.appendChild(inspectElement)
      }

      // 处理项目名称列的链接
      if (!itemCNameElement.querySelector('a')) { // 检查是否已经处理过
        const itemCName = itemCNameElement.innerHTML
        itemCNameElement.innerHTML = ''
        const inspectElement0 = document.createElement('a')
        inspectElement0.role = 'button'
        inspectElement0.innerHTML = itemCName
        inspectElement0.style.textDecoration = 'none'
        inspectElement0.style.color = 'inherit'
        
        // 使用事件委托优化鼠标事件
        itemCNameElement.addEventListener('mouseover', () => {
          inspectElement0.style.textDecoration = 'underline'
          inspectElement0.style.color = 'blue'
        })
        itemCNameElement.addEventListener('mouseout', () => {
          inspectElement0.style.textDecoration = 'none'
          inspectElement0.style.color = 'inherit'
        })
        itemCNameElement.addEventListener('click', () => openWindow(projectNo))
        itemCNameElement.style.cursor = 'pointer'
        itemCNameElement.appendChild(inspectElement0)
        
        processedRows.add(i) // 标记为已处理
      }
    }
  }

  function updateGlobalItemNumberList1(): string[] {
    const dataGridRow1 = document.querySelector('#datagrid-row-r1-1-0')
    if (!dataGridRow1) return []
    const gridElement = dataGridRow1.parentElement
    if (!gridElement) return []
    
    // 批量查询所有项目编号元素，减少DOM查询次数
    const itemNumberElements = gridElement.querySelectorAll('[id^="datagrid-row-r1-1-"] td:nth-child(3) div a') as NodeListOf<HTMLAnchorElement>
    const itemNumberList1 = Array.from(itemNumberElements).map(el => el.innerText).filter(Boolean)
    
    // 检查数据是否发生变化，如果没有变化就不更新
    const hasChanged = itemNumberList1.length !== globalItemNumberList1.length || 
      itemNumberList1.some((item, index) => item !== globalItemNumberList1[index])
    
    if (hasChanged) {
      globalItemNumberList1 = itemNumberList1
      processedRows.clear() // 清空已处理标记，因为数据已更新
    }
    
    return itemNumberList1
  }

  function observeItemNumberList1() {
    let lastUpdateTime = 0
    const THROTTLE_DELAY = 500 // 节流延迟，从100ms增加到500ms
    
    // 使用 MutationObserver 替代定时器
    const observer = new MutationObserver((mutations) => {
      const now = Date.now()
      if (now - lastUpdateTime < THROTTLE_DELAY) return
      
      let shouldUpdate = false
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true
        }
      })
      
      if (shouldUpdate) {
        lastUpdateTime = now
        updateGlobalItemNumberList1()
        insertInspectFormLink(globalItemNumberList1.length)
      }
    })

    // 监听数据网格变化
    const gridContainer = document.querySelector('#datagrid-row-r1-1-0')?.parentElement
    if (gridContainer) {
      observer.observe(gridContainer, {
        childList: true,
        subtree: true
      })
    }

    // 初始化执行一次
    updateGlobalItemNumberList1()
    insertInspectFormLink(globalItemNumberList1.length)
  }

  async function listenFreshHotkeyEntrustList() {
    console.log('监听刷新快捷键')
    // 监听 Ctrl+D 键的弹起事件
    document.addEventListener('keydown', async function (event) {
      if (!event.ctrlKey) {
        return
      }
      if (event.key === 'd') {
        event.preventDefault() // 阻止默认的保存行为
        doFreshEntrustList()
      }
    })
  }

  function doFreshEntrustList() {
    const refreshButton = document.querySelector(
      'body > div.panel.easyui-fluid > div.easyui-panel.panel-body.panel-noscroll > div > div > div.datagrid-pager.pagination > table > tbody > tr > td:nth-child(13) > a'
    ) as HTMLAnchorElement
    if (refreshButton) refreshButton.click()
  }

  function listenVisibilityChangeEntrustList(autoRefreshDuration: number) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时记录时间
        hiddenTimeEntrustList = Date.now()
      } else if (hiddenTimeEntrustList) {
        // 页面显示时，检查是否超过10秒
        const hiddenDuration = Date.now() - hiddenTimeEntrustList
        if (hiddenDuration >= autoRefreshDuration) {
          // 10秒 = 10000毫秒
          doFreshEntrustList()
          console.log('离开页面10秒，刷新列表')
        }
        hiddenTimeEntrustList = null
      }
    })
  }

  interface LinkParams {
    systemId: string
    projectId: string
    entrustId: string
    category: string
    from: 'query'
  }

  async function getCategory(
    projectNo: string
  ): Promise<LinkParams | undefined> {
    if (!projectNo) return undefined
    try {
      const [startDate, endDate] = parseDate(projectNo)
      const response = await fetch(
        `https://${window.location.host}/rest/inspect/query?projectNo=${projectNo}&startDate=${startDate}&endDate=${endDate}&page=1&rows=10`,
        {
          method: 'GET',
          credentials: 'include', // 包含 cookies
        }
      )
      if (!response.ok) {
        console.log('请求失败1')
        return undefined
      }
      const { rows }: QueryResultData = await response.json()
      if (rows.length < 1) return undefined
      return {
        systemId: rows[0]['systemId'],
        projectId: rows[0]['projectId'],
        entrustId: rows[0]['entrustId'],
        category: rows[0]['category'],
        from: 'query',
      } as LinkParams
    } catch {
      console.log('请求失败2')
      return undefined
    }
  }

  interface QueryResultData {
    rows: QueryResultDataRow[]
    total: number
  }

  interface QueryResultDataRow {
    according?: string
    appraiseDate?: string
    appraiser?: string
    appraiserName?: string
    attchmentFiles?: string[]
    category?: string
    checkDate?: string
    checked?: boolean
    checker?: string
    checkerName?: string
    checkLocation?: string
    checkLocationName?: string
    classOrDiv?: string
    component?: null
    conclusions?: number
    createdBy?: string
    createdByName?: string
    createdDate?: string
    editStatus?: number
    entrustId?: string
    id?: string
    itemCName?: string
    itemEName?: string
    market?: string
    modifiedBy?: string
    modifiedByName?: string
    modifiedDate?: string
    pg?: string
    principalName?: string
    projectId?: string
    projectNo?: string
    psn?: string
    repeat?: boolean
    systemId?: string
    unno?: string
  }

  async function openWindow(projectNo: string) {
    const linkParams = await getCategory(projectNo)
    if (!linkParams) return
    const params = new URLSearchParams({
      projectId: linkParams.projectId,
      entrustId: linkParams.entrustId,
      category: linkParams.category,
      from: linkParams.from,
    })
    const link = `/${linkParams.systemId}/inspect?${params.toString()}`
    console.log(link)
    window.open(link, '_blank')
  }

  // 页面卸载时的清理工作
  function cleanup() {
    domCache.clear()
    dataCache.clear()
    processedRows.clear()
  }

  // 监听页面卸载
  window.addEventListener('beforeunload', cleanup)
  window.addEventListener('unload', cleanup)
}

import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { sleep } from '../share/utils'

/**
 * rollback内容脚本
 * 主要特性：
 * 1. 使用setInterval轮询DOM变化
 * 2. 缓存DOM查询结果和日期计算
 * 3. 使用防抖和节流机制优化事件处理
 * 4. 避免重复添加事件监听器
 * 5. 使用requestAnimationFrame优化DOM操作
 */

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/flow/inspect/inspect/main'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  const Qmsg = getQmsg()
  let hiddenTimeInspectList: number | null = null

  // 缓存日期计算结果，避免重复计算
  const currentDate = new Date()
  const endDate = currentDate.toISOString().split('T')[0]
  const startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  chrome.storage.local.get(
    [
      'onekeyRollback',
      'nextYearColor',
      'nextYearBgColor',
      'freshHotkey',
      'autoRefreshDuration',
    ],
    async function (result: {
      onekeyRollback: boolean,
      nextYearColor: string,
      nextYearBgColor: string,
      freshHotkey: boolean,
      autoRefreshDuration: number,
    }) {
      if (!(result.freshHotkey === false)) {
        await listenFreshHotkeyInspectList()
        listenVisibilityChangeInspectList(result?.autoRefreshDuration ?? 10000)
      }
      setupColorChangeObserver(
        result.nextYearColor ?? '',
        result.nextYearBgColor ?? '#76EEC6'
      )
      await sleep(500)
      // 替换橘黄色
      if (result.onekeyRollback === false) {
        console.log('未启用一键退回，退出脚本')
        return
      }
      setupInspectListObserver()
    }
  )

  // function

  async function rollback(taskId: string): Promise<boolean> {
    const body = {
      taskId: taskId,
      reason: '',
    }
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/rollback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(body),
      }
    )
    if (!response.ok) return false
    const data = await response.json()
    return data.result === 'success'
  }

  async function rollbackOneKey(taskId: string) {
    if (!taskId) {
      Qmsg['error']('退回失败1', { timeout: 500 })
      return
    }

    try {
      // inspect
      const projectId = await getProjectIdByTaskId(taskId)
      if (!(await rollback(taskId))) {
        Qmsg['error']('退回失败1', { timeout: 500 })
        return
      }

      // assign
      const taskId2 = await getTaskIdByProjectId(projectId)
      if (taskId2 && !(await rollback(taskId2))) {
        Qmsg['error']('退回失败2', { timeout: 500 })
        return
      }

      Qmsg['success']('退回成功', { timeout: 1000 })
      doFreshInspectList()
    } catch (error) {
      console.error('rollbackOneKey error:', error)
      Qmsg['error']('退回过程中发生错误', { timeout: 1000 })
    }
  }

  // 检验页面
  async function getProjectIdByTaskId(taskId: string) {
    if (!taskId) return ''
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/get/inspect?projectStartDate=${startDate}&projectEndDate=${endDate}&projectState=0&page=1&rows=10`,
      {
        method: 'GET',
        credentials: 'include', // 包含 cookies
      }
    )
    if (!response.ok) {
      console.error('get task ids failed')
      return ''
    }
    const data = await response.json()
    const matchedRow = data['rows'].find((row: Task) => row['id'] === taskId)
    return matchedRow?.projectId || ''
  }

  // 分配页面
  async function getTaskIdByProjectId(projectId: string) {
    if (!projectId) return ''
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/get/assignInspect?projectStartDate=${startDate}&projectEndDate=${endDate}&projectState=0&page=1&rows=10`,
      {
        method: 'GET',
        credentials: 'include', // 包含 cookies
      }
    )
    if (!response.ok) {
      console.error('get task ids failed')
      return ''
    }
    const data = await response.json()
    const matchedRow = data['rows'].find((row: Task) => row['projectId'] === projectId)
    return matchedRow?.id || ''
  }


  function insertRollbackButton() {
    const targets = document.getElementById('datagrid-row-r1-2-0')
      ?.parentElement?.children
    if (!targets) return 

    for (let i = 0; i < targets.length; i++) {
      const row = targets[i]
      const len = row.children.length
      const target = row.children[len - 1]

      const tmpInnerHTML = target.innerHTML
      const matches = tmpInnerHTML.match(/\('([a-z0-9]+)'\)/)
      if (!matches || matches.length < 2) continue

      const taskId = matches[1]

      // 检查是否已经处理过这个按钮
      if (target.innerHTML.includes('退退退')) {
        continue
      }

      target.innerHTML = tmpInnerHTML
        .replace('rollback', 'void')
        .replace('>回退', '>退退退')

      const button = target.children[0].children[0] as HTMLElement
      button.addEventListener('click', function () {
        rollbackOneKey(taskId)
      })
    }
  }

  // 使用setInterval轮询DOM来优化性能
  function setupColorChangeObserver(nextYearColor: string, nextYearBgColor: string) {
    // 使用requestAnimationFrame来节流DOM操作
    let isProcessing = false

    function processColorChange() {
      if (isProcessing) return
      isProcessing = true

      requestAnimationFrame(() => {
        for (let i = 0; i < 100; i++) {
          const target = document.querySelector(
            `#datagrid-row-r1-2-${i}`
          ) as HTMLTableRowElement
          if (!target) continue
          if (target && target.style.color === 'orange') {
            target.style.color = nextYearColor
            target.style.backgroundColor = nextYearBgColor
          }
        }
        isProcessing = false
      })
    }

    // 定期检查，但频率降低到500ms
    setInterval(processColorChange, 500)
  }

  // 使用setInterval轮询DOM变化，间隔200ms
  function setupInspectListObserver() {
    // 使用setInterval定期检查并插入按钮
    setInterval(() => {
      insertRollbackButton()
    }, 200)

    // 初始执行一次
    insertRollbackButton()
  }

  async function listenFreshHotkeyInspectList() {
    console.log('监听刷新快捷键')
    // 使用节流来避免快速连续按键导致的多次执行
    let isProcessing = false

    document.addEventListener('keydown', async function (event) {
      if (isProcessing || !event.ctrlKey || event.key !== 'd') {
        return
      }

      isProcessing = true
      event.preventDefault() // 阻止默认的保存行为

      try {
        doFreshInspectList()
      } finally {
        // 使用短暂延迟防止重复触发
        setTimeout(() => {
          isProcessing = false
        }, 200)
      }
    })
  }

  // 缓存刷新按钮的查询结果
  let cachedRefreshButton: HTMLAnchorElement | null = null

  function doFreshInspectList() {
    if (!cachedRefreshButton) {
      cachedRefreshButton = document.querySelector(
        'body > div.panel.easyui-fluid > div.easyui-panel.panel-body.panel-noscroll > div > div > div.datagrid-pager.pagination > table > tbody > tr > td:nth-child(13) > a'
      ) as HTMLAnchorElement
    }

    if (cachedRefreshButton) {
      cachedRefreshButton.click()
    }
  }

  function listenVisibilityChangeInspectList(autoRefreshDuration: number) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时记录时间
        hiddenTimeInspectList = Date.now()
      } else if (hiddenTimeInspectList) {
        // 页面显示时，检查是否超过10秒
        const hiddenDuration = Date.now() - hiddenTimeInspectList
        if (hiddenDuration >= autoRefreshDuration) {
          // 10秒 = 10000毫秒
          doFreshInspectList()
          console.log('离开页面10秒，刷新列表')
        }
        hiddenTimeInspectList = null
      }
    })
  }

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
}

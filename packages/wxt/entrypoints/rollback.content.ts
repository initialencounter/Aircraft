import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { sleep } from '../share/utils'
import { getLocalConfig } from '../share/utils'

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
  let openInNewTab = false;
  const localConfig = await getLocalConfig()
  chrome.storage.local.get(
    [
      'openInNewTab',
      'onekeyRollback',
      'nextYearColor',
      'nextYearBgColor',
      'freshHotkey',
      'autoRefreshDuration',
    ],
    async function (result) {
      if (!(result.freshHotkey === false)) {
        await listenFreshHotkeyInspectList()
        listenVisibilityChangeInspectList(result?.autoRefreshDuration ?? 10000)
      }
      if (!(result.openInNewTab === false)) {
        openInNewTab = true
      }
      removeOrangeRollBack(
        result.nextYearColor ?? '',
        result.nextYearBgColor ?? '#76EEC6'
      )
      await sleep(500)
      // 替换橘黄色
      if (result.onekeyRollback === false) {
        console.log('未启用一键退回，退出脚本')
        return
      }
      observeInspectList()
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
  }

  // 检验页面
  async function getProjectIdByTaskId(taskId: string) {
    if (!taskId) return ''
    const currentDate = new Date()
    const date = currentDate.toISOString().split('T')[0]
    currentDate.setMonth(currentDate.getMonth() - 1)
    const startDate = currentDate.toISOString().split('T')[0]
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/get/inspect?projectStartDate=${startDate}&projectEndDate=${date}&projectState=0&page=1&rows=10`,
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
    const projectIds = data['rows']
      .filter(function (row: Task) {
        if (row['id'] === taskId) return true
      })
      .map((item: Task) => item.projectId)
    return projectIds[0]
  }

  // 分配页面
  async function getTaskIdByProjectId(projectId: string) {
    if (!projectId) return ''
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
    const taskIds = data['rows']
      .filter(function (row: Task) {
        if (row['projectId'] === projectId) return true
      })
      .map((item: Task) => item.id)
    return taskIds[0]
  }

  function insertRollbackButton() {
    const targets = document.getElementById('datagrid-row-r1-2-0')
      ?.parentElement?.children
    if (!targets) return false
    for (let i = 0; i < targets.length; i++) {
      const len = targets[i].children.length
      const target = targets[i].children[len - 1]
      insertOpenInNewTab(targets[i].children[0].children[0].children[0] as HTMLAnchorElement)
      // 删除无用的列
      // targets[i].children[1].remove()
      const tmpInnerHTML = target.innerHTML
      const matches = tmpInnerHTML.match(/\('([a-z0-9]+)'\)/)
      if (!matches) continue
      if (matches.length < 2) continue
      const taskId = matches[1]
      if (target.innerHTML.includes('退退退')) {
        continue
      }
      target.innerHTML = tmpInnerHTML
        .replace('rollback', 'void')
        .replace('>回退', '>退退退')
      target.children[0].children[0].addEventListener('click', function () {
        rollbackOneKey(taskId)
      })
    }
  }

  function removeOrangeRollBack(
    nextYearColor: string,
    nextYearBgColor: string
  ) {
    setInterval(() => {
      for (let i = 0; i < 10; i++) {
        const targets = document.querySelector(
          `#datagrid-row-r1-2-${i}`
        ) as HTMLTableRowElement
        if (targets) {
          if (targets.style.color !== 'orange') continue
          targets.style.color = nextYearColor
          targets.style.backgroundColor = nextYearBgColor
        }
      }
    }, 100)
  }

  async function listenFreshHotkeyInspectList() {
    console.log('监听刷新快捷键')
    // 监听 Ctrl+D 键的弹起事件
    document.addEventListener('keydown', async function (event) {
      if (!event.ctrlKey) {
        return
      }
      if (event.key === 'd') {
        event.preventDefault() // 阻止默认的保存行为
        doFreshInspectList()
      }
    })
  }

  function doFreshInspectList() {
    const refreshButton = document.querySelector(
      'body > div.panel.easyui-fluid > div.easyui-panel.panel-body.panel-noscroll > div > div > div.datagrid-pager.pagination > table > tbody > tr > td:nth-child(13) > a'
    ) as HTMLAnchorElement
    if (refreshButton) refreshButton.click()
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

  function observeInspectList() {
    setInterval(insertRollbackButton, 100)
  }

  function insertOpenInNewTab(element: HTMLAnchorElement) {
    if (openInNewTab === false) return
    element.target = '_blank'
    element.rel = 'noopener noreferrer'
  }
}

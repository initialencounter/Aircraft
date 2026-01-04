import { getLocalConfig, sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { addShotListener, startSyncInterval } from '../share/screenshot'
import type { EntrustFormData } from './modules/amount/types'
import { startListenAmount } from './modules/amount'
import { getFormData } from './modules/amount'

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

let immediatePayManual = false
let importButtonClicked = false

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/sales/entrust/main'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  let assignRunning = false
  let globalAssignUser = ''
  let globalCheckAssignUser = true
  const Qmsg = getQmsg()
  const localConfig = await getLocalConfig()
  await sleep(500)
  if (localConfig.enableSetEntrust === false) {
    console.log('未启用设置委托单，退出脚本')
    return
  }
  console.log('委托单脚本运行中...')
  createMask()
  setMoonPay()
  setCategory()
  setAmountListener()
  insertReloadButton()
  startFollow()
  if (localConfig.screenshotItemName === true) addShotListener(Qmsg)
  if (localConfig.tagNextYear === true) setTagNextYearListener()
  startSyncInterval()
  startListenAmount(localConfig.amount)
  chrome.storage.local.get(
    ['assignUser', 'saveAndAssign', 'checkAssignUser'],
    async function (data) {
      const assignUser = data.assignUser as string
      globalAssignUser = assignUser
      globalCheckAssignUser = data.checkAssignUser === false ? false : true
      console.log('保存并分配脚本运行中...', data)
      if (!(data.saveAndAssign === false))
        await insertSaveAndAssignButton(assignUser)
    }
  )

  // function

  function setTagNextYearListener() {
    const importButton = document.querySelector("#importbutton")
    if (importButton) {
      importButton.addEventListener("click", function () {
        importButtonClicked = true
        setTimeout(() => {
          importButtonClicked = false
        }, 60000)
      })
    }
  }

  function setAmountListener() {
    const immediatePayButton = document.getElementById(
      'immediatePay'
    ) as HTMLInputElement
    if (immediatePayButton) {
      immediatePayButton.addEventListener('click', function () {
        immediatePayManual = true
      })
    }
    const importButton = document.querySelector(
      '#importbutton'
    ) as HTMLAnchorElement
    if (importButton) {
      importButton.addEventListener('click', function () {
        immediatePayManual = false
      })
    }
    const paymentCompanyText = document.getElementById(
      'txt_paymentCompanyContact'
    )
    if (paymentCompanyText) {
      const config = { attributes: true, childList: true, subtree: true }
      const callback = function (mutationsList: MutationRecord[]) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.')
            setTagNextYear()
            setMoonPay()
          }
        }
      }
      const observer = new MutationObserver(callback)
      observer.observe(paymentCompanyText, config)
    }
  }

  function setCategory() {
    const target = document.getElementById(
      `_easyui_combobox_i5_${localConfig.category}`
    ) as HTMLDivElement
    if (target) {
      target.click()
    }
  }

  function setMoonPay() {
    if (localConfig.moonPay === false) return
    // 判断用户是不是手动选择的月结，如果是则取消
    if (immediatePayManual) return
    const target = document.getElementById('monthPay') as HTMLInputElement
    if (target) {
      target.click()
    }
  }

  function setTagNextYear() {
    if (localConfig.tagNextYear === false) return
    if (importButtonClicked === false) return
    const nextYear = document.getElementById('nextYear') as HTMLInputElement
    if (nextYear) nextYear.click()
  }

  async function insertSaveAndAssignButton(uid: string) {
    const parentElement = document.querySelector('#entrustBottomFollower')
    if (!parentElement) return

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
    parentElement.appendChild(select)

    // assign button
    const assignButton = document.createElement('a')
    assignButton.href = 'javascript:void(0);'
    assignButton.className = 'easyui-linkbutton l-btn l-btn-small'
    assignButton.dataset.options = 'width:120'
    assignButton.style.width = '118.4px'
    assignButton.innerHTML = `
      <span class='l-btn-left' style='margin-top: 0px;'>
        <span class='l-btn-text'>保存并分配</span>
      </span>
      `
    assignButton.onclick = saveAndAssign
    parentElement.appendChild(assignButton)
    console.log('保存并分配按钮插入成功')
  }

  function getEntrustFormData(): EntrustFormData | undefined {
    const data = getFormData()
    if (!data) return
    var errorContents = []

    if (data.checkLocation !== '8') {
      errorContents.push('检查地点错误')
    }

    if (isEmpty(data.itemCName)) errorContents.push('物品中文名称不能为空')
    if (isEmpty(data.itemEName)) errorContents.push('物品英文名称不能为空')

    if (isEmpty(data.principalContact) || isEmpty(data.principal)) {
      errorContents.push('委托方不能为空')
    }

    var category = data.category

    if (category === 'battery' || category === 'sodium') {
      if (isEmpty(data.manufacturersCName))
        errorContents.push('物品种类为电池类时：生产厂家中文不能为空')
      if (isEmpty(data.manufacturersEName))
        errorContents.push('物品种类为电池时类：生产厂家英文不能为空')
    }

    if (errorContents.length > 0) {
      alert(errorContents.join('\n'))
      return
    }

    if (data.reportCopy) {
      if (+data.reportCopy > 20) {
        if (!confirm('报告确定是' + data.reportCopy + '份吗？')) return
      }
    }
    return data as EntrustFormData
  }

  async function checkAssignUID(users: User[], uid: string) {
    if (!uid) return false
    if (!users.length) return false
    for (let i = 0; i < users.length; i++) {
      if (users[i]?.userId === uid) return true
    }
    return false
  }

  async function getUsers(): Promise<User[]> {
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/users/inspect`
    )
    if (!response.ok) return []
    const users: User[] = await response.json()
    return users
  }

  async function saveAndAssign() {
    if (assignRunning) return
    assignRunning = true
    showMask()
    try {
      const select = document.getElementById(
        'lims_onekey_assign_user'
      ) as HTMLSelectElement
      const selectUid = select.value
      if (!selectUid) {
        assignRunning = false
        hideMask()
        return
      }
      if (globalAssignUser !== selectUid) {
        chrome.storage.local.set({ assignUser: selectUid })
        globalAssignUser = selectUid
      }
      const data: EntrustFormData | undefined = getEntrustFormData()
      if (!data) {
        assignRunning = false
        hideMask()
        return
      }
      const id = await saveFormData(data)
      if (!id) {
        assignRunning = false
        hideMask()
        return
      }
      await okAssignTask(id, selectUid)
    } catch (error) {
      console.error(error)
    } finally {
      assignRunning = false
      hideMask()
    }
  }

  function isEmpty(value: string | undefined) {
    return !value || value.length === 0
  }

  async function saveFormData(data: EntrustFormData) {
    const response = await fetch(
      `https://${window.location.host}/rest/sales/entrust`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(data),
      }
    )
    if (!response.ok) {
      console.error('assign task failed1')
      return
    }
    const result = await response.json()
    const id = result['id']
    console.log('saveFormData: ', id)
    return id
  }

  async function okAssignTask(id: string, uid: string) {
    if (uid === '2c91808478367c2801788230b248470e' && globalCheckAssignUser) {
      const res = confirm('确定主检员是正确的吗？')
      if (!res) return
    }
    console.log('okAssignTask:', id)
    const receiveIds = await ReceiveSubmit([id], 'receive')
    if (!receiveIds.length) return
    console.log('receiveIds:', receiveIds)
    const submitIds = await ReceiveSubmit(receiveIds, 'submit')
    if (!submitIds.length) return
    console.log('submitIds:', submitIds)
    const taskIds = await getTaskIds(submitIds)
    if (!taskIds) return
    console.log('taskIds:', taskIds)
    await assignTask(taskIds, uid)
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
    return data['rows']
      .filter(function (row: Task) {
        for (let i = 0; i < ids.length; i++) {
          if (row['entrustId'] === ids[i]) return true
        }
        return false
      })
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

  function insertReloadButton() {
    const parentElement = document.querySelector(
      'body > div.panel.easyui-fluid > div.easyui-panel.panel-body'
    )
    if (!parentElement) return
    const bottomElement = document.createElement('div')
    bottomElement.id = 'entrustBottomFollower'
    bottomElement.style.cssText = `
        position: relative;
      `
    const reloadButton = document.createElement('a')
    reloadButton.href = 'javascript:void(0);'
    reloadButton.className = 'easyui-linkbutton l-btn l-btn-small'
    reloadButton.dataset.options = 'width:120'
    reloadButton.style.width = '118.4px'
    reloadButton.innerHTML = `
      <span class='l-btn-left' style='margin-top: 0;'>
        <span class='l-btn-text'>刷新页面</span>
      </span>
      `
    reloadButton.onclick = () => {
      document.location.reload()
    }
    bottomElement.appendChild(reloadButton)
    parentElement.appendChild(bottomElement)
  }

  function createMask() {
    const mask = document.createElement('div')
    mask.id = 'assignMask'
    mask.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `

    const loadingText = document.createElement('div')
    loadingText.style.cssText = `
        color: white;
        font-size: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 20px 40px;
        border-radius: 8px;
      `
    loadingText.textContent = '正在处理中...'

    mask.appendChild(loadingText)
    document.body.appendChild(mask)
  }

  function showMask() {
    const mask = document.getElementById('assignMask')
    if (mask) {
      mask.style.display = 'flex'
    }
  }

  function hideMask() {
    const mask = document.getElementById('assignMask')
    if (mask) {
      mask.style.display = 'none'
    }
  }

  function updatePosition(target: HTMLElement, follower: HTMLElement) {
    const update = () => {
      const targetRect = target.getBoundingClientRect()
      follower.style.left = targetRect.left + 'px'
      animationFrameId = requestAnimationFrame(update)
    }

    let animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }

  function startFollow() {
    const target = document.querySelector(
      '#entrustEditForm > table > tbody'
    ) as HTMLElement
    const follower = document.querySelector(
      '#entrustBottomFollower'
    ) as HTMLElement

    if (target && follower) {
      const cleanup = updatePosition(target, follower)

      window.addEventListener('unload', cleanup)
    }
  }
}

import { getLocalConfig, sleep } from "@/share/utils";
import { getQmsg } from '@/share/qmsg'
import '../assets/message.min.css'
import { addShotListener, startSyncInterval } from "@/share/screenshot";


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

export interface EntrustFormData {
  amount: string;
  category: string;
  checkLocation: string;
  destination: string;
  id: string;
  itemBrand: string;
  itemCName: string;
  itemColor: string;
  itemDanger: string;
  itemDangerReason: string;
  itemDesc: string;
  itemEName: string;
  itemFlashPoint: string;
  itemMeltingPoint: string;
  itemOtherAttachFileDetail: string;
  itemSampleHandle: string;
  itemSampleHandleOther: string;
  itemSendSample: string;
  itemSmell: string;
  itemSpec: string;
  itemStatus: string;
  manufacturersCName: string;
  manufacturersEName: string;
  market: string;
  nextYear: string;
  paymentCompany: string;
  paymentCompanyContact: string;
  payType: string;
  pieces: string;
  principal: string;
  principalContact: string;
  principalExhort: string;
  principalExhortDetail: string;
  reportCopy: string;
  reportLocation: string;
  reportWay: string;
  serviceType: string;
  systemId: string;
  trustee: string;
  waybillNo: string;
  webWt: string;
}

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/sales/entrust/main'
  ],
  allFrames: true, async main() {
    entrypoint()
  }
});

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
  addShotListener(Qmsg)
  startSyncInterval()
  chrome.storage.local.get(['assignUser', 'saveAndAssign', 'checkAssignUser'], async function (data) {
    const assignUser = data.assignUser as string
    globalAssignUser = assignUser
    globalCheckAssignUser = data.checkAssignUser === false ? false : true
    console.log('保存并分配脚本运行中...', data)
    if (!(data.saveAndAssign === false)) await insertSaveAndAssignButton(assignUser)
  })

  // function

  function setAmountListener() {
    setAmount()
    const paymentCompanyText = document.getElementById(
      'txt_paymentCompanyContact'
    )
    if (paymentCompanyText) {
      const config = { attributes: true, childList: true, subtree: true }
      const callback = function (mutationsList: MutationRecord[]) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.')
            setAmount()
            setTagNextYear()
            setMoonPay()
          }
        }
      }
      const observer = new MutationObserver(callback)
      observer.observe(paymentCompanyText, config)
    }
    const pekSystemButton = document.getElementById('_easyui_combobox_i1_0')
    if (pekSystemButton)
      pekSystemButton.addEventListener('click', () => {
        setAmount()
      })
    const sekSystemButton = document.getElementById('_easyui_combobox_i1_1')
    if (sekSystemButton)
      sekSystemButton.addEventListener('click', () => {
        setAmount()
      })
    const aekSystemButton = document.getElementById('_easyui_combobox_i1_2')
    if (aekSystemButton)
      aekSystemButton.addEventListener('click', () => {
        setAmount()
      })
    const rekSystemButton = document.getElementById('_easyui_combobox_i1_3')
    if (rekSystemButton)
      rekSystemButton.addEventListener('click', () => {
        setAmount()
      })
  }

  function setCategory() {
    const target = document.getElementById(
      `_easyui_combobox_i5_${localConfig.category}`
    ) as HTMLDivElement
    if (target) {
      target.click()
    }
  }

  async function setAmount(moneyDefault: string = '') {
    let money = (moneyDefault !== '' ? moneyDefault : localConfig.amount).slice()
    await sleep(200)
    const target = document.querySelectorAll(
      'input[type="hidden"][class="textbox-value"][name="amount"]'
    )[0] as HTMLInputElement
    if (target) {
      target.value = money
    }
    const targetShows = document.querySelectorAll(
      'input[type="text"][class="textbox-text validatebox-text"][autocomplete="off"]'
    )
    const targetShow = targetShows[targetShows.length - 1] as HTMLInputElement
    if (targetShow) {
      targetShow.value = '￥' + money
    }
  }

  function setMoonPay() {
    if (localConfig.moonPay === false) return
    const target = document.getElementById('monthPay') as HTMLInputElement
    if (target) {
      target.click()
    }
  }

  function setTagNextYear() {
    if (localConfig.tagNextYear === false) return
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
    select.style.background = 'linear-gradient(to bottom,#ffffff 0,#e6e6e6 100%)'
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
    const formElement = document.forms[0] as HTMLFormElement;
    if (!formElement) return
    // 获取表单数据
    const formData = new FormData(formElement);
    const data: Partial<EntrustFormData> = {};

    // 遍历 FormData 并构建数据对象
    formData.forEach((value, name) => {
      if (data[name as keyof Partial<EntrustFormData>]) {
        // 如果已存在该字段，添加逗号并附加新值
        data[name as keyof Partial<EntrustFormData>] = (data[name as keyof Partial<EntrustFormData>] + `,${value}`) as EntrustFormData[keyof EntrustFormData];
      } else {
        // 如果是新字段，直接赋值
        data[name as keyof Partial<EntrustFormData>] = value as EntrustFormData[keyof EntrustFormData];
      }
    })
    var errorContents = [];
    if (isEmpty(data.itemCName)) errorContents.push('物品中文名称不能为空');
    if (isEmpty(data.itemEName)) errorContents.push('物品英文名称不能为空');


    if (isEmpty(data.principalContact) || isEmpty(data.principal)) {
      errorContents.push('委托方不能为空');
    }

    var category = data.category;

    if (category === 'battery' || category === 'sodium') {
      if (isEmpty(data.manufacturersCName)) errorContents.push('物品种类为电池类时：生产厂家中文不能为空');
      if (isEmpty(data.manufacturersEName)) errorContents.push('物品种类为电池时类：生产厂家英文不能为空');
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
      if (users[i].userId === uid) return true
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
      let data: EntrustFormData | undefined = getEntrustFormData()
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
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(data)
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
      let res = confirm('确定主检员是正确的吗？')
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
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(ids)
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
        credentials: 'include' // 包含 cookies
      }
    )
    if (!response.ok) {
      console.error('get task ids failed')
      return []
    }
    const data = await response.json()
    const taskIds = data['rows']
      .filter(function (row: Task) {
        for (let i = 0; i < ids.length; i++) {
          if (row['entrustId'] === ids[i]) return true
        }
      })
      .map((item: Task) => item.id)
    return taskIds
  }

  async function assignTask(taskIds: string[], uid: string) {
    if (!taskIds.length) return
    if (!uid) return
    const body = {
      userId: uid,
      taskIds: taskIds
    }
    const response = await fetch(
      `https://${window.location.host}/rest/flow/task/do/assignInspect`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 包含 cookies
        body: JSON.stringify(body)
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
    const parentElement = document.querySelector('body > div.panel.easyui-fluid > div.easyui-panel.panel-body')
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
      <span class='l-btn-left' style='margin-top: 0px;'>
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
      const targetRect = target.getBoundingClientRect();
      follower.style.left = targetRect.left + 'px';
      animationFrameId = requestAnimationFrame(update);
    };

    let animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }

  function startFollow() {
    const target = document.querySelector('#entrustEditForm > table > tbody') as HTMLElement;
    const follower = document.querySelector('#entrustBottomFollower') as HTMLElement;

    if (target && follower) {
      const cleanup = updatePosition(target, follower);

      window.addEventListener('unload', cleanup);
    }
  }

}
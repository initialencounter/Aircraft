import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { sleep } from '../share/utils'

interface User {
  userId: string
  userName: string
}

/**
 * ApifoxModel
 */
export interface ExperimentFormData4 {
  according: string;
  checker: string;
  comments: string;
  conclusion1: string;
  conclusion2: string;
  equipment1text: string;
  equipment2text: string;
  equipment3text: string;
  experimentName: string;
  experimentNo: string;
  humidity: string;
  item2text: string;
  jsonData: string;
  p: string;
  projectId: string;
  providing: string;
  remainingQty: string;
  remark1: string;
  remark10: string;
  remark11: string;
  remark2: string;
  remark3: string;
  remark4: string;
  remark5: string;
  remark6: string;
  remark7: string;
  remark8: string;
  remark9: string;
  sampleId: string;
  sampleName: string;
  sampleNo: string;
  sampleSize: string;
  surplus: string;
  surveyor: string;
  taskId: string;
  temperature: string;
  temperature1: string;
  temperature10: string;
  temperature2: string;
  temperature3: string;
  temperature4: string;
  temperature5: string;
  temperature6: string;
  temperature7: string;
  temperature8: string;
  temperature9: string;
  [property: string]: any;
}

const ExperimentIDMap: Record<string, string> = {
  "气溶胶着火距离试验": "1",
  "气溶胶泡沫燃烧试验": "2",
  "气溶胶密闭空间着火试验": "3",
  "液体闪点试验": "4",
  "易燃固体燃烧试验": "5",
  "自发热物质试验": "6",
  "自燃物质试验": "7",
  "遇水释放易燃气体物质试验": "8",
  "氧化性物质试验": "9",
  "金属腐蚀性试验": "10",
  "密封型电池定性试验": "11",
  "磁性物质试验": "12",
  "其它试验": "13",
}

const IDExperimentMap: Record<string, string> = {
  "1": "气溶胶着火距离试验",
  "2": "气溶胶泡沫燃烧试验",
  "3": "气溶胶密闭空间着火试验",
  "4": "液体闪点试验",
  "5": "易燃固体燃烧试验",
  "6": "自发热物质试验",
  "7": "自燃物质试验",
  "8": "遇水释放易燃气体物质试验",
  "9": "氧化性物质试验",
  "10": "金属腐蚀性试验",
  "11": "密封型电池定性试验",
  "12": "磁性物质试验",
  "13": "其它试验",
}


export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/flow/inspect/assignexperiment/main',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  const Qmsg = getQmsg()
  const localConfig = await chrome.storage.local.get(['assignExperiment', 'assignExperimentUser'])
  const dataCache = new Map<string, any>()
  const currentDate = new Date()
  const endDate = currentDate.toISOString().split('T')[0]
  const startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  await sleep(400)
  if (localConfig.assignExperiment !== false) {
    createMask()
    insetBatchAssignChecker()
    insetBatchAssignButton()
    listenTableChange()
  }

  function listenTableChange() {
    const refreshButton = document.querySelector('.datagrid-pager > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(13) > a:nth-child(1)') as HTMLAnchorElement
    const nextPageButton = document.querySelector('.datagrid-pager > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(10) > a:nth-child(1)') as HTMLAnchorElement
    const prevPageButton = document.querySelector('.datagrid-pager > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(4) > a:nth-child(1)') as HTMLAnchorElement
    const lastPageButton = document.querySelector('.datagrid-pager > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(11) > a:nth-child(1)') as HTMLAnchorElement
    const firstPageButton = document.querySelector('.datagrid-pager > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3) > a:nth-child(1)') as HTMLAnchorElement
    const searchButton = document.querySelector('#searchBtn') as HTMLAnchorElement
    for (const button of [refreshButton, nextPageButton, prevPageButton, lastPageButton, firstPageButton, searchButton]) {
      if (button) {
        button.addEventListener('click', () => {
          setTimeout(() => {
            insetBatchAssignChecker()
            const checkboxes = document.querySelectorAll('.BatchAssignCheckBox') as NodeListOf<HTMLInputElement>
            checkboxes.forEach(checkbox => {
              checkbox.checked = false
            })
            const headerCheckbox = document.querySelector('.datagrid-header-check > input') as HTMLInputElement
            if (headerCheckbox) headerCheckbox.checked = false
          }, 500)
        })
      }
    }
  }

  function insetBatchAssignChecker() {
    const tableHeader = document.querySelector('.datagrid-view2 > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1)')
    if (!tableHeader) return

    const checkboxHeader = createCheckboxHeaderElement()
    if (tableHeader.innerHTML.includes('datagrid-header-check'))
      tableHeader.removeChild(tableHeader.children[0])
    tableHeader.insertBefore(checkboxHeader, tableHeader.children[0])
    const parentContainer = document.querySelector('.datagrid-view2 > div:nth-child(2) > table:nth-child(1) > tbody:nth-child(1)')
    if (!parentContainer) return
    for (let i = 0; i < parentContainer.children.length; i++) {
      const parent = parentContainer.children[i]
      if (!parent) return
      const href = (parent?.children?.[0].children?.[0].children?.[0] as HTMLAnchorElement)?.href
      if (!href) continue
      const taskId = href.split("'")[1]
      if (parent.innerHTML.includes('BatchAssignCheckBox')) continue
      parent.insertBefore(createCheckboxElement(taskId), parent.children[0]);
    }
  }
  function createCheckboxElement(taskId: string) {
    const checkbox = document.createElement('td')
    checkbox.setAttribute('field', 'id')

    const div = document.createElement('div')
    div.className = 'datagrid-cell-check'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = 'id'
    input.value = taskId
    // input.style.margin = '6px'
    input.className = "BatchAssignCheckBox"

    div.appendChild(input)
    checkbox.appendChild(div)
    return checkbox
  }

  function createCheckboxHeaderElement() {
    const checkboxHeader = document.createElement('td')
    checkboxHeader.setAttribute('field', 'id')
    const div = document.createElement('div')
    div.className = 'datagrid-header-check'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.addEventListener('click', (event) => {
      const isChecked = (event.target as HTMLInputElement).checked
      const checkboxes = document.querySelectorAll('.BatchAssignCheckBox') as NodeListOf<HTMLInputElement>
      checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked
      })
    })
    div.appendChild(input)
    checkboxHeader.appendChild(div)
    return checkboxHeader
  }

  function getCheckedTaskIds() {
    const TaskDict: Record<string, string> = {}
    const checkboxes = document.querySelectorAll('.BatchAssignCheckBox') as NodeListOf<HTMLInputElement>
    const checkedTaskIds: string[] = []
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        checkedTaskIds.push(checkbox.value)
        TaskDict[checkbox.value] = checkbox?.parentElement?.parentElement?.parentElement?.children?.[1].children?.[0].children?.[0]?.innerHTML ?? ''
      }
    })
    return { TaskDict, checkedTaskIds }
  }

  async function insetBatchAssignButton() {
    const targetParent = document.getElementById('toolbar')
    if (!targetParent) return
    // 不重复创建
    if (targetParent.innerHTML.includes('experiment_assign_user')) return
    // 创建按钮容器并设置样式，避免与footer冲突
    const buttonContainer = document.createElement('div')
    buttonContainer.style.display = 'flex'
    buttonContainer.style.gap = '4px'
    buttonContainer.style.alignItems = 'center'
    buttonContainer.style.padding = '4px 0'
    buttonContainer.style.borderTop = '1px solid #ddd'
    buttonContainer.style.marginTop = '4px'
    buttonContainer.style.backgroundColor = '#f9f9f9'
    // button
    const assignButton = document.createElement('a')
    assignButton.href = 'javascript:void(0);'
    assignButton.className = 'easyui-linkbutton l-btn l-btn-small'
    assignButton.dataset.options = 'width:120'
    assignButton.style.width = '158.4px'
    assignButton.innerHTML = `
  <span class='l-btn-left' style='margin-top: 0px;'>
    <span class='l-btn-text'>分配并提交试验单：</span>
  </span>
  `
    assignButton.onclick = batchAssignAndSubmitExperiment

    // select
    const select = document.createElement('select')
    select.id = 'experiment_assign_user'
    select.style.width = '120px'
    select.style.height = '26px'
    select.style.border = '1px solid #bbb'
    select.style.background =
      'linear-gradient(to bottom,#ffffff 0,#e6e6e6 100%)'
    select.className = 'easyui-linkbutton l-btn l-btn-small'
    select.setAttribute('textboxname', 'systemId')
    select.setAttribute('comboname', 'systemId')
    const users = await getExperimentUsers()
    users.forEach(function (user) {
      const option = document.createElement('option')
      option.value = user.userId
      option.innerText = user.userName
      select.appendChild(option)
    })

    if (localConfig.assignExperimentUser
      && checkAssignUID(users, localConfig.assignExperimentUser))
      select.value = localConfig.assignExperimentUser

    // 将按钮和选择框添加到容器中
    buttonContainer.appendChild(assignButton)
    buttonContainer.appendChild(select)

    // 将容器添加到目标父元素
    targetParent.appendChild(buttonContainer)

    // 动态调整footer位置，避免被按钮遮挡
    adjustFooterPosition(buttonContainer)
  }

  function adjustFooterPosition(buttonContainer: HTMLElement) {
    const footer = document.querySelector('.datagrid-pager') as HTMLDivElement
    if (!footer) return

    const updateFooterPosition = () => {
      // 获取按钮容器的实际高度
      const containerHeight = buttonContainer.offsetHeight
      const containerMargin = 4 // 8px padding + 8px margin

      // 动态设置footer的bottom值，确保不被遮挡
      const totalOffset = containerHeight + containerMargin
      footer.style.bottom = `${totalOffset}px`
      footer.style.position = 'relative'
      footer.style.zIndex = '1000'
    }

    // 初始调整
    updateFooterPosition()

    // 使用ResizeObserver监听容器大小变化（如果支持）
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        updateFooterPosition()
      })
      resizeObserver.observe(buttonContainer)
    }

    // 延迟再次调整，确保DOM完全渲染后的准确性
    setTimeout(updateFooterPosition, 100)
  }

  async function getExperimentUsers(): Promise<User[]> {
    // 添加缓存机制，避免重复请求
    const cacheKey = 'users_cache'
    const cached = dataCache.get(cacheKey) as { data: User[], timestamp: number } | null
    const CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      const response = await fetch(
        `https://${window.location.host}/rest/flow/task/users/experiment`,
        {
          method: 'GET',
          credentials: 'include', // 包含 cookies
        }
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

  async function getExperimentId(taskId: string): Promise<string[] | null> {
    try {
      const response = await fetch(
        `https://${window.location.host}/rest/flow/task/get/experiment/${taskId}`,
        {
          method: 'GET',
          credentials: 'include', // 包含 cookies
        }
      )
      if (!response.ok) return null
      const data = await response.json()
      const experimentIds: string[] = data.map((item: any) => item.id)
      return experimentIds
    } catch (error) {
      console.error('Failed to fetch experiment ID:', error)
      return null
    }
  }

  async function doAssignExperiment(taskId: string, experimentId: string[], userId: string[]) {
    try {
      const body = { taskId, experimentId, userId, }
      const response = await fetch(
        `https://${window.location.host}/rest/flow/task/do/assignExperiment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 包含 cookies
          body: JSON.stringify(body),
        })
      if (!response.ok) {
        console.error(`Failed to assign experiment for task ${taskId}:`, response.statusText)
        return false
      }
      return true
    } catch (error) {
      console.error(`Failed to assign experiment for task ${taskId}:`, error)
      return false
    }
  }

  async function doSubmitExperiment(data: ExperimentFormData4 | any) {
    try {
      const response = await fetch(
        `https://${window.location.host}/rest/inspect/experiment/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 包含 cookies
          body: JSON.stringify(data),
        })
      if (!response.ok) {
        console.error(`Failed to Submit experiment`, response.statusText)
        return false
      }
      return true
    } catch (error) {
      console.error(`Failed to Submit experiment`, error)
      return false
    }
  }

  function getSelectedExperimentUser(): string {
    const select = document.getElementById(
      'experiment_assign_user'
    ) as HTMLSelectElement
    return select.value
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

  function checkAssignUID(users: User[], uid: string): boolean {
    if (!uid || !users.length) return false
    // 使用 some 方法提高查找性能
    return users.some(user => user.userId === uid)
  }

  function makeExperimentFormData(htmlString: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const form = doc.getElementById('experimentForm') as HTMLFormElement;
    if (!form) return null;

    const formData = new FormData(form);
    const data: Partial<ExperimentFormData4> = {}
    formData.forEach((value, name) => {
      if (data[name]) {
        // 如果已存在该字段，添加逗号并附加新值
        data[name] = (data[name] +
          `,${value}`)
      } else {
        // 如果是新字段，直接赋值
        data[name] = value
      }
    })
    const jsonData = JSON.stringify(data)
    data['jsonData'] = jsonData
    return data as ExperimentFormData4
  }

  async function getExperimentHtmlURL(projectNo: string, experimentId: string) {
    try {
      const response = await fetch(
        `https://${window.location.host}/rest/flow/task/get/experiment?systemId=&itemCName=&itemEName=&entrustCustomerCName=&entrustCustomerEName=&projectStartDate=${startDate}&projectEndDate=${endDate}&projectNo=${projectNo}&projectState=0&page=1&rows=10`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )
      if (!response.ok) return false
      const rows = (await response.json()).rows
      for (const data of rows) {
        if (ExperimentIDMap[data.taskName] === experimentId && data.projectNo === projectNo) {
          return `https://${window.location.host}/inspect/experiment/type/${experimentId}?taskId=${data.id}&systemId=${projectNo.slice(0, 3).toLowerCase()}&projectId=${data.projectId}&entrustId=${data.entrustId}&experimentId=${experimentId}&experimentName=${encodeURIComponent(data.taskName)}`
        }
      }
      return false
    } catch (error) {
      console.error('Failed to fetch experiment task IDs:', error)
      return false
    }
  }

  async function getHtmlText(experimentFormHtmlURL: string): Promise<string> {
    try {
      const response = await fetch(
        experimentFormHtmlURL,
        {
          method: 'GET',
          credentials: 'include', // 包含 cookies
          redirect: 'follow', // 自动跟随重定向
        }
      )

      // 检查是否发生了重定向
      if (response.redirected) {
        console.log(`重定向到: ${response.url}`)
      }

      if (!response.ok) return ''
      const html = await response.text()
      return html
    } catch (error) {
      console.error('Failed to fetch experiment form HTML:', error)
      return ''
    }
  }
  async function batchAssignAndSubmitExperiment() {
    const errorMessages: string[] = []

    const checkedTaskIds = getCheckedTaskIds()
    if (checkedTaskIds.checkedTaskIds.length === 0) {
      alert('请先选择项目')
      return
    }
    const selectUid = getSelectedExperimentUser()
    if (!selectUid) {
      alert('请先选择分配用户')
      return
    }

    if (!localConfig.assignExperimentUser) {
      const next = confirm('首次分配, 确定试验员正确吗？')
      if (!next) return
    }

    // 存储选择的用户到本地存储
    if (!localConfig.assignExperimentUser || localConfig.assignExperimentUser !== selectUid) {
      chrome.storage.local.set({ assignExperimentUser: selectUid })
    }
    showMask()
    try {
      for (const taskId of checkedTaskIds.checkedTaskIds) {
        const experimentId = await getExperimentId(taskId)
        if (!experimentId?.length) {
          errorMessages.push(`任务 ${taskId} 获取试验 id 失败`)
          continue
        }

        const assignUser: string[] = []
        experimentId.forEach(() => {
          assignUser.push(selectUid)
        })

        const success = await doAssignExperiment(taskId, experimentId, assignUser)
        if (!success) {
          errorMessages.push(`任务 ${taskId} 分配失败`)
          continue
        }

        const projectNo = checkedTaskIds.TaskDict[taskId]
        for (const experimentIdItem of experimentId) {
          const experimentFormHtmlURL = await getExperimentHtmlURL(projectNo, experimentIdItem)
          const experimentName = IDExperimentMap[experimentIdItem]
          if (!experimentFormHtmlURL) {
            errorMessages.push(`任务 ${projectNo} 获取 ${experimentName} 试验单URL失败`)
            continue
          }

          const formHtml = await getHtmlText(experimentFormHtmlURL)
          if (!formHtml) {
            errorMessages.push(`任务 ${projectNo} 获取 ${experimentName} 试验单HTML失败`)
            continue
          }
          const submitData = makeExperimentFormData(formHtml)
          if (!submitData) {
            errorMessages.push(`任务 ${projectNo} 解析 ${experimentName} 试验单数据失败`)
            continue
          }

          const submitSuccess = await doSubmitExperiment(submitData)
          if (!submitSuccess) {
            errorMessages.push(`任务 ${projectNo} 提交 ${experimentName} 试验单失败`)
            continue
          }
          await sleep(100) // 每次请求后等待500毫秒，避免请求过快
        }
      }
    }
    catch (error) {
      console.error(error)
      errorMessages.push(`任务处理失败`)
    }
    finally {
      hideMask()
    }
    if (errorMessages.length === 0) {
      Qmsg['success']('分配成功')
    } else {
      confirm(errorMessages.join('\n'))
    }
    // window.location.reload()
  }
}

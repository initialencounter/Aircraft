import {
  getCategory,
  getClipboardText,
  getLocalConfig,
  getMonthsAgoProjectNo,
  getSystemId,
  setProjectNoToClipText,
  sleep,
} from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
    'https://*/pek/inspect*',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  console.log('快捷键脚本运行中...')
  const fromQuery =
    new URLSearchParams(window.location.search).get('from') === 'query'
  let changed = false
  let originalTitle: string

  let ctrlPressCount = 0
  let lastCtrlPressTime = 0
  let cPressCount = 0
  let lastCPressTime = 0
  const category = getCategory()
  const localConfig = await getLocalConfig()
  const systemId = getSystemId()
  const Qmsg = getQmsg()
  await sleep(500)
  // 将项目编号设置为标题
  if (localConfig.enableCopyProjectNo) {
    const projectNoElement = document.getElementById('projectNo')
    if (projectNoElement) {
      document.title = projectNoElement.innerHTML
      originalTitle = document.title
      // 复制报告编号
      if (projectNoElement.parentElement) {
        projectNoElement.parentElement.addEventListener('click', () => {
          setProjectNoToClipText()
          Qmsg.success('已复制项目编号', { timeout: 500 })
        })
      }
    }
  }

  const btySizeSek = document.getElementById(
    systemId === 'PEKGZ' ? 'size' : 'btySize'
  ) as HTMLInputElement
  if (btySizeSek) {
    btySizeSek.style.setProperty('width', '428px')
    btySizeSek.parentElement?.style.setProperty('width', '428px')
  }

  const otherDescribeCAddition = document.getElementById(
    'otherDescribeCAddition'
  ) as HTMLInputElement
  if (otherDescribeCAddition && systemId !== 'PEKGZ') {
    otherDescribeCAddition.style.setProperty('width', '750px')
    otherDescribeCAddition.parentElement?.style.setProperty('width', '758px')
  }

  const wattHourInput = document.getElementById(
    'inspectionItem1Text1'
  ) as HTMLInputElement
  if (wattHourInput && systemId !== 'PEKGZ') {
    wattHourInput.style.setProperty('width', '252px')
    wattHourInput.parentElement?.style.setProperty('width', '260px')
  }

  // 自定义图标
  if (localConfig.customIcon) {
    if (systemId === 'PEKGZ') {
      changeFavicon(
        'data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiINCiAgICBzdHlsZT0id2lkdGg6IDFlbTtoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyINCiAgICB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcC1pZD0iMzY0NiI+DQogICAgPHBhdGgNCiAgICAgICAgZD0iTTUxMiA2MDguMzA3OTQzNkw4MDEuMDY1MjUyMTUgMzE5LjI0MjY5MTQ1czQ4LjE1Mzk3MTgtNDguMTUzOTcxOCAwLTk2LjMwNzk0MzYtOTYuMzA3OTQzNiAwLTk2LjMwNzk0MzYgMGwtMTY4LjY0NDk2NzMxIDE2OC42NDQ5NjczMUwxNzQuNzEwMDY1MzcgMzE5LjI0MjY5MTQ1bC00OC4xNTM5NzE3OSA0OC4xNTM5NzE4IDI4OS4wNjUyNTIxNCAxNDQuNTMyNjI2MDctMTM0LjkxNTk3Mzg1IDEzNC45MTU5NzM4NS0xMzAuMTA3NjQ3NzMtMTQuNDI0OTc4MzMtNDguMTUzOTcxOCA0OC4xNTM5NzE3OUwyNzEuMDg4NzE5NjUgNzUyLjkxMTI4MDM1bDcyLjI2NjMxMzA0IDE2OC41NzQyNTY2NCA0OC4xNTM5NzE4LTQ4LjE1Mzk3MTgtMTQuNDI0OTc4MzQtMTMwLjEwNzY0Nzc0TDUxMiA2MDguMzA3OTQzNnpNNzA0Ljc1NzMwODU1IDg0OS4yODk5MzQ2M0w2MzkuMzQ5OTMxMjkgNTIyLjUzNTg5MTA0bC0xMTMuNDkwNjM4MzggMTEzLjQ5MDYzODM4IDEzMC43NDQwNDM4NCAyNjEuNDE3Mzc3eiINCiAgICAgICAgcC1pZD0iMzY0NyIgZmlsbD0iIzUxYTAyMCI+PC9wYXRoPg0KPC9zdmc+'
      )
    } else if (systemId === 'SEKGZ') {
      changeFavicon(
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIiBzdHlsZT0id2lkdGg6IDFlbTtoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiBwLWlkPSIxMDAyIj48cGF0aCBkPSJNNTE1LjU4NCAxMDIuNGExMzcuMjE2IDEzNy4yMTYgMCAwIDEgMTM5LjY3NCAxMzUuMTY4IDEzNy40NzIgMTM3LjQ3MiAwIDAgMS00Mi4zOTQgMTAxLjgzNyAxNzguMDIyIDE3OC4wMjIgMCAwIDAtNTQuNDc3IDEyOC42NjV2MS40MzRoMTY5LjgzYzMuNzM4IDAgNi44MSAzLjA3MiA2LjgxIDYuODF2NjcuOTQyYzAgMy43MzgtMy4wNzIgNi44MS02LjgxIDYuODFINTU4LjI4NnYzMzguMjI3YzcyLjM5Ny03LjQ3NSAxMzkuNTItMzQuODE2IDE4OS44NS03Ni44YTEzLjY3IDEzLjY3IDAgMCAwLTIuNDU4LTIyLjYzbC02Ny40My0zNC42MTJhMy40MyAzLjQzIDAgMCAxIDAuNTExLTYuMjk3bDE4NS44NTYtNTkuODAyYTYuNjU2IDYuNjU2IDAgMCAxIDguNSA0LjI1bDU5LjgwMSAxODUuODU2YTMuMzggMy4zOCAwIDAgMS00Ljc2MSA0LjA5Nkw4NDguMjMgODQyLjI5YTEzLjQ2NiAxMy40NjYgMCAwIDAtMTYuMDc2IDIuNzE0Yy02Ni44NjggNzAuOTYzLTE2Ni40IDExNi43MzYtMjczLjc2NyAxMjUuOTUyYTU1NS45MzggNTU1LjkzOCAwIDAgMS0yNi4xNjMgMS41MzZoLTI3Ljk1NWE0NjAuMjg4IDQ2MC4yODggMCAwIDEtMTY2LjI5OC0zNS42ODcgMzk4LjI4NSAzOTguMjg1IDAgMCAxLTEzNC43MDctOTEuODAxIDEzLjQ2NiAxMy40NjYgMCAwIDAtMTYuMDc3LTIuNzE0bC03OS44NzIgNDEuMjE2YTMuMzggMy4zOCAwIDAgMS00Ljc2MS00LjA5Nmw1OS40OTQtMTg2LjAxYTYuOTEyIDYuOTEyIDAgMCAxIDguNjAyLTQuNDAzbDE4NS45MDcgNTkuMzkyYzIuODY3IDAuOTIyIDMuMjI1IDQuOTE2IDAuNTEyIDYuMjk4bC02Ny4zOCAzNC43MTRhMTMuNjcgMTMuNjcgMCAwIDAtMi40NTcgMjIuNjNjNTAuNDgzIDQxLjg4MiAxMTcuNjU4IDY5LjI3NCAxODkuNTQyIDc2LjkwMlY1NTEuMDY2SDMwNi44NDJhNi44MSA2LjgxIDAgMCAxLTYuODEtNi44MXYtNjcuOTQyYzAtMy43MzggMy4wNzItNi44MSA2LjgxLTYuODFoMTY5Ljk4NHYtMS40MzRjMC00OC44OTYtMjAuMzI3LTk1LjIzMi01NS4zNDgtMTI5LjQzM0ExMzcuNjc3IDEzNy42NzcgMCAwIDEgNTE1LjYzNSAxMDIuNHogbTIuMDQ4IDgxLjYxM2E1Ni4xMTUgNTYuMTE1IDAgMCAwIDAgMTEyLjEyOCA1Ni4xMTUgNTYuMTE1IDAgMCAwIDAtMTEyLjEyOHoiIHAtaWQ9IjEwMDMiIGZpbGw9IiMzZThlZDAiLz48L3N2Zz4='
      )
    } else if (systemId === 'REKGZ') {
      changeFavicon(
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23EA3323'%3E%3Cpath d='M160-340v-380q0-41 19-71.5t58.5-50q39.5-19.5 100-29T480-880q86 0 146.5 9t99 28.5Q764-823 782-793t18 73v380q0 59-40.5 99.5T660-200l60 60v20h-70l-80-80H390l-80 80h-70v-20l60-60q-59 0-99.5-40.5T160-340Zm320-480q-120 0-173 15.5T231-760h501q-18-27-76.5-43.5T480-820ZM220-545h234v-155H220v155Zm440 60H220h520-80Zm-146-60h226v-155H514v155ZM335-315q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm290 0q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm-325 60h360q34 0 57-25t23-60v-145H220v145q0 35 23 60t57 25Zm180-505h252-501 249Z'/%3E%3C/svg%3E"
      )
    } else if (systemId === 'AEKGZ') {
      changeFavicon(
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%238C1AF6'%3E%3Cpath d='M224.12-161q-49.12 0-83.62-34.42Q106-229.83 106-279H40v-461q0-24 18-42t42-18h579v167h105l136 181v173h-71q0 49.17-34.38 83.58Q780.24-161 731.12-161t-83.62-34.42Q613-229.83 613-279H342q0 49-34.38 83.5t-83.5 34.5Zm-.12-60q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17ZM100-339h22q17-27 43.04-43t58-16q31.96 0 58.46 16.5T325-339h294v-401H100v401Zm631 118q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17Zm-52-204h186L754-573h-75v148ZM360-529Z'/%3E%3C/svg%3E"
      )
    }
  }

  // 复制项目名称
  if (localConfig.enableCopyProjectName) {
    const itemCNameElement = document.getElementById('itemCName')
    if (itemCNameElement && itemCNameElement.parentElement) {
      itemCNameElement.parentElement.addEventListener(
        'dblclick',
        copyProjectName
      )
    }
  }
  // 监听改动
  if (localConfig.enablePreventCloseBeforeSave && !fromQuery) {
    watchInput()
    // 保存时重置改动状态
    watchSaveBtn()
    // 阻止关闭
    preventClose()
  }

  // 导入检验单时设置分类
  if (localConfig.enableSetImportClassification && !fromQuery) {
    await importClassification()
  }

  // 监听 Ctrl 键的弹起事件
  document.addEventListener('keyup', function (event) {
    if (event.key === 'Control' && localConfig.enableCopyProjectNo) {
      // 双击 Ctrl 键的检测
      const currentTime = new Date().getTime()
      // 检查两次 Ctrl 按键的时间间隔
      if (currentTime - lastCtrlPressTime < 500) {
        // 500毫秒内双击认为是双击
        ctrlPressCount++
      } else {
        ctrlPressCount = 1 // 超过时间间隔，重置计数
      }
      lastCtrlPressTime = currentTime
      // 当双击 Ctrl 键时触发的事件
      if (ctrlPressCount === 2) {
        setProjectNoToClipText()
        Qmsg.success('已复制项目编号', { timeout: 500 })
        // 触发一次双击事件后重置计数
        ctrlPressCount = 0
      }
    }
    if (event.key === 'c' && localConfig.enableCopyProjectName) {
      const currentTime = new Date().getTime()
      if (currentTime - lastCPressTime < 500) {
        cPressCount++
      } else {
        cPressCount = 1
      }
      lastCPressTime = currentTime
      if (cPressCount === 2 && event.ctrlKey) {
        copyProjectName()
        cPressCount = 0
      }
    }
  })
  if (
    (localConfig.enableSaveHotKey || localConfig.enableImportHotKey) &&
    !fromQuery
  ) {
    // 监听 Ctrl + S 的按下事件
    document.addEventListener('keydown', function (event) {
      if (!event.ctrlKey) {
        return
      }
      // 检查是否按下了Ctrl+S
      if (event.key === 's' && localConfig.enableSaveHotKey) {
        event.preventDefault() // 阻止默认的保存行为
        myCustomSaveFunction()
      }
      if (event.key === 'd' && localConfig.enableImportHotKey) {
        event.preventDefault() // 阻止默认的保存行为
        importDocument()
      }
    })
  }

  // function

  function myCustomSaveFunction() {
    const button = document.getElementById('saveBtn0')
    if (button) {
      button.click()
      Qmsg.success('保存成功', { timeout: 500 })
    } else {
      console.log('Button not found')
      Qmsg.error('保存失败')
    }
  }

  function importDocument() {
    const button = document.getElementById('importBtn0')
    if (button) {
      button.click()
    } else {
      console.log('Button not found')
    }
  }

  function copyProjectName() {
    const projectNameSpan = document.getElementById(
      'itemCName'
    ) as HTMLInputElement
    const projectName = projectNameSpan.value
    console.log(projectName)
    navigator.clipboard.writeText(projectName)
    Qmsg.success('已复制项目名称', { timeout: 500 })
  }

  function watchInput() {
    const table = document.getElementById(
      category === 'chemical' ? 'chemicalInspectForm' : 'batteryInspectForm'
    )?.children[3]
    table?.addEventListener('change', function (event: Event) {
      if (!document.hasFocus()) return
      const target = event.target as HTMLElement
      if (target) console.log('Changed tag name:', target.tagName)
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        console.log('Changed value:', target.value)
        changed = true
        document.title = `* ${originalTitle}`
      }
    })
  }

  function watchSaveBtn() {
    const saveBtn = document.getElementById('saveBtn0')
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        changed = false
        document.title = originalTitle
      })
    }
  }

  function preventClose() {
    window.addEventListener('beforeunload', function (event) {
      if (!changed) {
        return
      }
      const message =
        '您确定要离开此页面吗？未保存的更改可能会丢失。（ctrl+s 即可保存）'
      event.preventDefault() // 一些浏览器可能需要这一行
      event.returnValue = message // 标准的浏览器要求设置这个属性
      return message // 对于一些旧版浏览器
    })
  }

  async function importClassification() {
    console.log('导入分类脚本运行中...')
    await sleep(200)
    const importBtn = document.getElementById('importBtn0')
    if (importBtn) {
      importBtn.addEventListener('click', classification)
    }
  }

  async function classification() {
    const projectNameSpan = document.getElementById(
      'itemCName'
    ) as HTMLInputElement
    if (!projectNameSpan) {
      return
    }
    let projectNo = await getClipboardText()
    projectNo = projectNo.replace(/[^0-9A-Z]/g, '')
    const qProjectNo = document.getElementById('qProjectNo') as HTMLInputElement
    const currentProjectNo = qProjectNo.value
    if (
      projectNo.startsWith(systemId) &&
      projectNo.length === 17 &&
      currentProjectNo !== projectNo
    ) {
      qProjectNo.value = projectNo
      const searchButton = document.getElementById(
        'searchBtn'
      ) as HTMLButtonElement
      if (searchButton) {
        await sleep(100)
        searchButton.click()
        await sleep(200)
        const reslutRow1 = document.querySelector(
          '#datagrid-row-r10-2-0'
        ) as HTMLElement
        if (reslutRow1) {
          reslutRow1.click()
        } else {
          console.log('reslutRow1 not found')
        }
      } else {
        console.log('searchButton not found')
      }
      return
    }
    // qProjectNo.value = systemId
    if (!localConfig.autoProjectNoPreset) {
      if (systemId.startsWith('PEK'))
        qProjectNo.value = localConfig.pekProjectNoPreset
      else if (systemId.startsWith('SEK'))
        qProjectNo.value = localConfig.sekProjectNoPreset
      else if (systemId.startsWith('AEK'))
        qProjectNo.value = localConfig.aekProjectNoPreset
      else if (systemId.startsWith('REK'))
        qProjectNo.value = localConfig.rekProjectNoPreset
    } else qProjectNo.value = getMonthsAgoProjectNo()
    setQItemCName1Text(projectNameSpan.value)
    setUnNo(projectNameSpan.value)
    const importBtn = document.getElementById('importBtn0')
    if (importBtn) {
      importBtn.removeEventListener('click', classification)
    }
  }
  function setQItemCName1Text(projectName: string) {
    const searchInput = document.getElementById(
      'qItemCName1'
    ) as HTMLInputElement
    if (!searchInput) {
      return
    }
    if (!projectName) {
      return
    }
    let text = ''
    if (projectName.includes('包装')) {
      text = '包装'
    }
    if (projectName.includes('内置')) {
      text = '内置'
    }
    if (projectName.includes('充电盒')) {
      text = '充电盒'
    }
    if (projectName.includes('充电仓')) {
      text = '充电仓'
    }
    searchInput.value = text
  }

  function setUnNo(projectName: string) {
    const UnNoInputItem = document.getElementById('qUnNo') as HTMLInputElement
    if (!UnNoInputItem) {
      return
    }
    if (!projectName) {
      return
    }
    if (projectName.includes('电子烟')) {
      return
    }
    if (
      projectName.includes('电动车') ||
      projectName.includes('滑板车') ||
      projectName.includes('平衡车') ||
      projectName.includes('移动机器人') ||
      projectName.includes('自动引导车') ||
      projectName.includes('AGV') ||
      projectName.includes('AMR') ||
      projectName.includes('电动自行车') ||
      projectName.includes('电动摩托车') ||
      projectName.includes('快仓机器人') ||
      projectName.includes('极智机器人') ||
      projectName.includes('助力自行车') ||
      projectName.includes('电摩') ||
      projectName.includes('电动三轮车') ||
      projectName.includes('电动滑板车') ||
      projectName.includes('搬运车')
    ) {
      UnNoInputItem.value = '3556'
      return
    }
    const isDangerous = isDangerousGoods(projectName)
    if (!isDangerous) {
      return
    }
    let UnNo = ''
    const isLiIonBattery = isLiIon(projectName)
    console.log('isLiIonBattery:', isLiIonBattery)
    if (isLiIonBattery) {
      UnNo = '3481'
    }
    if (
      !projectName.includes('包装') &&
      !projectName.includes('内置') &&
      isLiIonBattery
    ) {
      UnNo = '3480'
    }
    UnNoInputItem.value = UnNo
  }

  function isDangerousGoods(projectName: string) {
    const wattHour = matchWattHour(projectName)
    if (wattHour) {
      if (wattHour > 100) {
        return true
      }
      if (projectName.includes('芯') && wattHour > 20) {
        return true
      }
    }
    return false
  }

  function matchWattHour(projectName: string) {
    const matches = [...projectName.matchAll(/\s(\d+\.?\d+)[Kk]?[Ww][Hh]/g)]
    const results = matches.map((match) => match[1])
    let wattHour = Number(results[0])
    if (!results.length) return 0
    if (isNaN(wattHour)) return 0
    if (projectName.toLowerCase().includes('kwh')) wattHour *= 1000
    return wattHour
  }

  function isLiIon(projectName: string) {
    const metalBattery = ['纽扣', '锂金属', 'CR2032', 'CR2025']
    if (metalBattery.some((item) => projectName.includes(item))) {
      return false
    }
    return true
  }

  function changeFavicon(iconURL: string) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = iconURL
  }
}

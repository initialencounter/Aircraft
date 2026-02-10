import {
  getCategory,
  getClipboardText,
  getLocalConfig,
  getMonthsAgoProjectNo,
  getSystemId,
  setProjectNoToClipText,
  sleep,
  formatHexColor,
} from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { warmUp } from './modules/utils/api'
import { getCurrentProjectNo } from './modules/utils/helpers'

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
  let changedTarget: (HTMLInputElement | HTMLTextAreaElement)[] = []
  await sleep(500)
  const projectNo = getCurrentProjectNo()
  // 将项目编号设置为标题
  if (localConfig.enableCopyProjectNoByClick || localConfig.enableCopyProjectNoByCtrlDouble) {
    const projectNoElement = document.getElementById('projectNo')
    if (projectNoElement) {
      document.title = projectNoElement.innerHTML
      originalTitle = document.title
      // 复制报告编号
      if (projectNoElement.parentElement && localConfig.enableCopyProjectNoByClick) {
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
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='icon' style='width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;' viewBox='0 0 1024 1024' version='1.1' p-id='3646'%3E%3Cpath d='M512 608.3079436L801.06525215 319.24269145s48.1539718-48.1539718 0-96.3079436-96.3079436 0-96.3079436 0l-168.64496731 168.64496731L174.71006537 319.24269145l-48.15397179 48.1539718 289.06525214 144.53262607-134.91597385 134.91597385-130.10764773-14.42497833-48.1539718 48.15397179L271.08871965 752.91128035l72.26631304 168.57425664 48.1539718-48.1539718-14.42497834-130.10764774L512 608.3079436zM704.75730855 849.28993463L639.34993129 522.53589104l-113.49063838 113.49063838 130.74404384 261.417377z' p-id='3647' fill='%23${formatHexColor(localConfig.pekProjectNoColor ?? '')}'/%3E%3C/svg%3E`
      )
    } else if (systemId === 'SEKGZ') {
      changeFavicon(
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='icon' style='width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;' viewBox='0 0 1024 1024' version='1.1' p-id='1002'%3E%3Cpath d='M515.584 102.4a137.216 137.216 0 0 1 139.674 135.168 137.472 137.472 0 0 1-42.394 101.837 178.022 178.022 0 0 0-54.477 128.665v1.434h169.83c3.738 0 6.81 3.072 6.81 6.81v67.942c0 3.738-3.072 6.81-6.81 6.81H558.286v338.227c72.397-7.475 139.52-34.816 189.85-76.8a13.67 13.67 0 0 0-2.458-22.63l-67.43-34.612a3.43 3.43 0 0 1 0.511-6.297l185.856-59.802a6.656 6.656 0 0 1 8.5 4.25l59.801 185.856a3.38 3.38 0 0 1-4.761 4.096L848.23 842.29a13.466 13.466 0 0 0-16.076 2.714c-66.868 70.963-166.4 116.736-273.767 125.952a555.938 555.938 0 0 1-26.163 1.536h-27.955a460.288 460.288 0 0 1-166.298-35.687 398.285 398.285 0 0 1-134.707-91.801 13.466 13.466 0 0 0-16.077-2.714l-79.872 41.216a3.38 3.38 0 0 1-4.761-4.096l59.494-186.01a6.912 6.912 0 0 1 8.602-4.403l185.907 59.392c2.867 0.922 3.225 4.916 0.512 6.298l-67.38 34.714a13.67 13.67 0 0 0-2.457 22.63c50.483 41.882 117.658 69.274 189.542 76.902V551.066H306.842a6.81 6.81 0 0 1-6.81-6.81v-67.942c0-3.738 3.072-6.81 6.81-6.81h169.984v-1.434c0-48.896-20.327-95.232-55.348-129.433A137.677 137.677 0 0 1 515.635 102.4z m2.048 81.613a56.115 56.115 0 0 0 0 112.128 56.115 56.115 0 0 0 0-112.128z' p-id='1003' fill='%23${formatHexColor(localConfig.sekProjectNoColor ?? '')}'/%3E%3C/svg%3E`
      )
    } else if (systemId === 'REKGZ') {
      changeFavicon(
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23${formatHexColor(localConfig.rekProjectNoColor ?? '')}'%3E%3Cpath d='M160-340v-380q0-41 19-71.5t58.5-50q39.5-19.5 100-29T480-880q86 0 146.5 9t99 28.5Q764-823 782-793t18 73v380q0 59-40.5 99.5T660-200l60 60v20h-70l-80-80H390l-80 80h-70v-20l60-60q-59 0-99.5-40.5T160-340Zm320-480q-120 0-173 15.5T231-760h501q-18-27-76.5-43.5T480-820ZM220-545h234v-155H220v155Zm440 60H220h520-80Zm-146-60h226v-155H514v155ZM335-315q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm290 0q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm-325 60h360q34 0 57-25t23-60v-145H220v145q0 35 23 60t57 25Zm180-505h252-501 249Z'/%3E%3C/svg%3E`
      )
    } else if (systemId === 'AEKGZ') {
      changeFavicon(
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23${formatHexColor(localConfig.aekProjectNoColor ?? '')}'%3E%3Cpath d='M224.12-161q-49.12 0-83.62-34.42Q106-229.83 106-279H40v-461q0-24 18-42t42-18h579v167h105l136 181v173h-71q0 49.17-34.38 83.58Q780.24-161 731.12-161t-83.62-34.42Q613-229.83 613-279H342q0 49-34.38 83.5t-83.5 34.5Zm-.12-60q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17ZM100-339h22q17-27 43.04-43t58-16q31.96 0 58.46 16.5T325-339h294v-401H100v401Zm631 118q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17Zm-52-204h186L754-573h-75v148ZM360-529Z'/%3E%3C/svg%3E`
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
  watchInput()
  // 监听改动
  if (localConfig.enablePreventCloseBeforeSave && !fromQuery) {
    // 保存时重置改动状态
    watchSaveBtn()
    // 阻止关闭
    preventClose()
  }

  // 导入检验单时设置分类
  if (localConfig.enableSetImportClassification && !fromQuery) {
    await sleep(300);
    await importClassification()
  }

  // 监听 Ctrl 键的弹起事件
  document.addEventListener('keyup', function (event) {
    if (event.key === 'Control' && localConfig.enableCopyProjectNoByCtrlDouble) {
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
    // 使用事件捕获在文档级别监听,绕过 EasyUI 的事件处理
    document.addEventListener('input', function (event: Event) {
      debouncedWarmUp(projectNo ?? '')
      if (!localConfig.enablePreventCloseBeforeSave || fromQuery) return
      if (!document.hasFocus()) return
      const target = event.target as HTMLElement

      // 检查目标元素是否在表单内
      const formId = category === 'chemical' ? 'chemicalInspectForm' : 'batteryInspectForm'
      const form = document.getElementById(formId)
      if (!form || !form.contains(target)) return

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.parentElement && localConfig.markColorChangedInput) {
          if (target instanceof HTMLTextAreaElement) {
            target.style.background = localConfig.changedInputBackgroundColor ?? '#76EEC6'
          } else {
            if (target.className.includes('textbox-text')) {
              target.style.background = localConfig.changedInputBackgroundColor ?? '#76EEC6'
            } else {
              target.parentElement.style.background = localConfig.changedInputBackgroundColor ?? '#8A2BE2'
            }
          }
        }
        changedTarget.push(target)
        changed = true
        document.title = `* ${originalTitle}`
      }
    }, true) // 使用捕获阶段
  }

  function doSaveAction() {
    changed = false
    if (localConfig.markColorChangedInput) {
      changedTarget.forEach((element) => {
        element.style.background = ''
        if (element.parentElement)
          element.parentElement.style.background = ''
      })
    }
    changedTarget = []
    document.title = originalTitle
  }

  function watchSaveBtn() {
    const saveBtn1 = document.getElementById('saveBtn')
    if (saveBtn1) {
      saveBtn1.addEventListener('click', async function () {
        doSaveAction()
      })
    }
    const saveBtn = document.getElementById('saveBtn0')
    if (saveBtn) {
      saveBtn.addEventListener('click', async function () {
        doSaveAction()
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
    const projectNoSpan = document.getElementById('projectNo')
    const currentProjectNo = projectNoSpan?.innerText
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
        const resultRow1Selector = (systemId === 'PEKGZ') ? '#datagrid-row-r10-2-0' : '#datagrid-row-r7-2-0'
        const resultRow1 = document.querySelector(resultRow1Selector) as HTMLElement
        if (resultRow1) {
          resultRow1.click()
        } else {
          console.log('resultRow1 not found')
        }
      } else {
        console.log('searchButton not found')
      }
      return
    }
    // qProjectNo.value = systemId
    if (!localConfig.autoProjectNoPreset) {
      if (systemId.startsWith('PEK'))
        qProjectNo.value = localConfig.pekProjectNoPreset ?? ''
      else if (systemId.startsWith('SEK'))
        qProjectNo.value = localConfig.sekProjectNoPreset ?? ''
      else if (systemId.startsWith('AEK'))
        qProjectNo.value = localConfig.aekProjectNoPreset ?? ''
      else if (systemId.startsWith('REK'))
        qProjectNo.value = localConfig.rekProjectNoPreset ?? ''
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

  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }

  // 防抖保存函数
  function debouncedWarmUp(projectNo: string) {
    if (!localConfig.warmUp) return
    debounce(() => {
      warmUp(projectNo)
    }, 8000)()
  }
}

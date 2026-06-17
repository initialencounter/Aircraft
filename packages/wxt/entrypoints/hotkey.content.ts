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
import { warmUp } from './modules/utils/api'
import { getCurrentProjectNo } from './modules/utils/helpers'
import { switchFaviconBySystemId } from './modules/ui/favicon'
import { insertCalculationText, updateCalculationText } from './modules/ui/calculation'

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
  // 注入 jquery-interceptor，使 EasyUI combo 组件的变化能派发原生 input 事件
  injectJQueryInterceptor()
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
  let changedTarget: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] = []
  await sleep(500)
  const projectNo = getCurrentProjectNo()

  // 创建计算过程文本元素
  if (localConfig.showCalculationProcess) {
    insertCalculationText(systemId)
  }
  // 将项目编号设置为标题
  if (localConfig.setTitleWithProjectNo) {
    document.title = projectNo ? projectNo : document.title
  }
  originalTitle = document.title

  // 复制报告编号
  if (localConfig.enableCopyProjectNoByClick || localConfig.enableCopyProjectNoByCtrlDouble) {
    const projectNoElement = document.getElementById('projectNo')
    if (projectNoElement) {
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
    switchFaviconBySystemId(systemId, localConfig)
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
    const formId = category === 'chemical' ? 'chemicalInspectForm' : 'batteryInspectForm'
    const form = document.getElementById(formId)

    // 共享处理函数：统一的字段变更处理逻辑
    const handleFieldChange = (target: HTMLElement) => {
      debouncedWarmUp(projectNo ?? '')
      if (!localConfig.enablePreventCloseBeforeSave || fromQuery) return
      if (!document.hasFocus()) return
      if (!form || !form.contains(target)) return

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        if (target.parentElement) {
          if (localConfig.markColorChangedInput) {
            if (target instanceof HTMLTextAreaElement) {
              target.style.background = localConfig.changedInputBackgroundColor ?? '#76EEC6'
            } else if (target instanceof HTMLSelectElement) {
              // EasyUI 组件: select 元素本身被隐藏,标记其父容器
              const easyuiWrapper = target.closest('.combo') as HTMLElement
              if (easyuiWrapper) {
                easyuiWrapper.style.background = localConfig.changedInputBackgroundColor ?? '#8A2BE2'
              } else {
                target.parentElement.style.background = localConfig.changedInputBackgroundColor ?? '#8A2BE2'
              }
            } else {
              if (target.className.includes('textbox-text')) {
                target.style.background = localConfig.changedInputBackgroundColor ?? '#76EEC6'
                // EasyUI combo: 同时标记 combo 包装器（拦截器派发的 input 事件 target 为 textbox，非 select）
                const easyuiWrapper = target.closest('.combo') as HTMLElement
                if (easyuiWrapper) easyuiWrapper.style.background = localConfig.changedInputBackgroundColor ?? '#8A2BE2'
              } else {
                target.parentElement.style.background = localConfig.changedInputBackgroundColor ?? '#8A2BE2'
              }
            }
          }
          if (localConfig.showCalculationProcess && ['btyCount', 'otherDescribeCAddition'].includes(target.id)) {
            updateCalculationText()
          }
        }
        changedTarget.push(target)
        changed = true
        document.title = `* ${originalTitle}`
      }
    }

    /**
     * 从 .selectedText span 找到关联的表单控件。
     * HTML 结构中三者通常在同一父容器下为兄弟节点：
     *   <input type="hidden"> ← value holder
     *   <span class="selectedText"> ← display text
     *   <select class="easyui-combogrid"> ← EasyUI 组件
     */
    function findAssociatedControl(selectedText: HTMLElement): HTMLElement | null {
      let parent = selectedText.parentElement
      for (let i = 0; i < 3 && parent; i++) {
        const select = parent.querySelector('select[id$="Grid"]')
        if (select) return select as HTMLElement
        const hiddenInput = parent.querySelector('input[type="hidden"][id$="Value"]')
        if (hiddenInput) return hiddenInput as HTMLElement
        parent = parent.parentElement
      }
      return null
    }

    // 1. 监听原生 input 事件（用户键盘输入；EasyUI 拦截器派发的事件也走这里）
    document.addEventListener('input', (event: Event) => {
      handleFieldChange(event.target as HTMLElement)
    }, true)

    // 2. 监听原生 change 事件（原生 <select> 变更）
    document.addEventListener('change', (event: Event) => {
      handleFieldChange(event.target as HTMLElement)
    }, true)

    // 3. MutationObserver 安全网：捕获直接 DOM 操作（如清除按钮直接修改 .selectedText）
    if (form) {
      let moDebounceTimer: ReturnType<typeof setTimeout> | null = null
      const observer = new MutationObserver((mutations) => {
        if (moDebounceTimer) clearTimeout(moDebounceTimer)
        moDebounceTimer = setTimeout(() => {
          const processed = new Set<HTMLElement>()
          for (const m of mutations) {
            if (m.type !== 'childList') continue
            const target = m.target as HTMLElement
            // .selectedText 文本被直接修改（如 $('#colorText').text('')）
            if (target.classList?.contains('selectedText') && !processed.has(target)) {
              processed.add(target)
              const control = findAssociatedControl(target)
              if (control) {
                handleFieldChange(control)
              }
            }
          }
        }, 50)
      })
      observer.observe(form, { childList: true, subtree: true })
    }
  }

  function doSaveAction() {
    changed = false
    if (localConfig.markColorChangedInput) {
      changedTarget.forEach((element) => {
        element.style.background = ''
        if (element.parentElement)
          element.parentElement.style.background = ''
        // 重置 EasyUI combo 包装器的背景色（同时覆盖 HTMLSelectElement 和 HTMLInputElement textbox 两种路径）
        const easyuiWrapper = element.closest('.combo') as HTMLElement
        if (easyuiWrapper) easyuiWrapper.style.background = ''
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

  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }

  // 防抖执行预热函数
  function debouncedWarmUp(projectNo: string) {
    if (!localConfig.warmUp) return
    debounce(() => {
      warmUp(projectNo)
    }, 8000)()
  }

  /**
   * 注入 jquery-interceptor.js 到 page context。
   * 参考 fillSummary.content.ts 的 injectJQueryInterceptor 模式。
   *
   * jquery-interceptor 在 page context 中拦截 EasyUI combo/combobox/combogrid
   * 的 setValue/setText 方法，主动派发原生 input 事件，
   * 使 watchInput 能够监听到 EasyUI 组件的变化。
   */
  function injectJQueryInterceptor() {
    if ((window as any).__jquery_intercepted) {
      return
    }

    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('jquery-interceptor.js')
    script.onload = () => {
      (window as any).__jquery_intercepted = true
      script.remove()
    }
    script.onerror = (e) => {
      console.error('[JQuery Hook] Failed to load interceptor script:', e)
    }

    try {
      const target = document.head || document.documentElement || document
      target.appendChild(script)
    } catch (e) {
      console.error('[JQuery Hook] Failed to inject script:', e)
    }
  }
}

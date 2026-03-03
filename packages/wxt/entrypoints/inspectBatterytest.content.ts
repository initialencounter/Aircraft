import { getQmsg } from "../share/qmsg"
import { getLocalConfig, getSystemId, setProjectNoToClipText, sleep } from "../share/utils"
import { switchFaviconBySystemId } from "./modules/ui/favicon"
import '../assets/message.min.css'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest*'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  const Qmsg = getQmsg()
  const localConfig = await getLocalConfig()
  await sleep(500) // 等待页面内容加载
  const systemId = getSystemId()
  const fromQuery =
    new URLSearchParams(window.location.search).get('from') === 'query'

  if (!(localConfig.setTitleWithProjectNo === false)) {
    const projectNoElement = document.querySelector("#projectNo")
    if (projectNoElement) {
      document.title = '概要:' + projectNoElement.innerHTML
    }
  }

  if (localConfig.enableCopyProjectNoByClick) {
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

  // 自定义图标
  if (localConfig.customIcon) {
    switchFaviconBySystemId(systemId, localConfig)
  }

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
    })
  }

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

  function modifyTestDateInput() {
    const testDateInput = document.getElementById('testDate') as HTMLInputElement
    if (!testDateInput) return

    // EasyUI 将原始 input 隐藏，在其后生成 .textbox span 包裹层
    const textboxSpan = testDateInput.nextElementSibling as HTMLElement
    if (!textboxSpan || !textboxSpan.classList.contains('textbox')) return

    const textboxText = textboxSpan.querySelector<HTMLInputElement>('.textbox-text')
    const textboxValue = textboxSpan.querySelector<HTMLInputElement>('.textbox-value')
    if (!textboxText || !textboxValue) return

    // 移除只读限制，允许直接键入日期
    textboxText.removeAttribute('readonly')
    textboxText.placeholder = 'YYYY-MM-DD'

    function handleDateInput() {
      if (!textboxText || !textboxValue) return
      const val = textboxText.value.trim()
      if (!val) return

      const datePattern = /^\d{4}-\d{2}-\d{2}$/
      if (datePattern.test(val) && !isNaN(new Date(val).getTime())) {
        const hiddenInput = document.querySelector("#batteryInspectForm > div > div:nth-child(6) > table > tbody > tr:nth-child(1) > td:nth-child(5) > span > input.textbox-value") as HTMLInputElement
        if (hiddenInput) {
          hiddenInput.value = val
        }
        // 更新隐藏值字段
        textboxValue.value = val
        // 若页面加载了 EasyUI jQuery 插件，同步通知组件更新内部状态
        const $win = (window as any).$
        if ($win && $win.fn && $win.fn.datebox !== undefined) {
          $win('#testDate').datebox('setValue', val)
          // setValue 可能重新写入 readonly，再次移除以保持可编辑
          textboxText.removeAttribute('readonly')
        }
        Qmsg.success('日期已更新', { timeout: 800 })
      } else {
        // 格式非法，恢复上一次有效值
        textboxText.value = textboxValue.value
        Qmsg.error('请输入正确的日期格式：YYYY-MM-DD')
      }
    }

    textboxText.addEventListener('change', handleDateInput)
  }

  // 启用日期直接编辑
  modifyTestDateInput()
}


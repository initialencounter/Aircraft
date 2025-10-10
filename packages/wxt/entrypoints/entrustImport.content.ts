import { getClipboardText, sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/sales/entrust/dict/main?callback=entrust_dict_callback'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

// 全局变量用于清理
let isListening = false

async function entrypoint() {
  try {
    // 使用 Promise 化的 chrome.storage API
    const result = await chrome.storage.local.get(['autoImport'])
    if (result.autoImport === false) {
      console.log('未启用导入委托单，退出脚本')
      return
    }
    
    await sleep(400)
    await listenImportHotkey()
  } catch (error) {
    console.error('初始化失败:', error)
  }

  async function autoImport() {
    try {
      const projectNo = (await getClipboardText()).replace(/[^0-9A-Z]/g, '')
      console.log('项目编号：', projectNo)
      
      if (!projectNo) {
        console.log('没有项目编号，退出脚本')
        return
      }

      // 保持原来的选择器不变
      const projectNoInput = document.querySelector(
        '#projectNo'
      ) as HTMLInputElement
      if (projectNoInput) {
        projectNoInput.value = projectNo
      }
      
      const searchBtn = document.querySelector(
        '#toolbar > p:nth-child(2) > a:nth-child(5)'
      ) as HTMLAnchorElement
      if (searchBtn) {
        searchBtn.click()
      }
      
      // 还原原来的 setInterval 轮询方式
      const handle = setInterval(() => {
        const row1 = document.querySelector(
          'body > div > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table > tbody > tr:nth-child(1)'
        )
        if (row1) {
          row1.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
          clearInterval(handle)
        }
      }, 200)
    } catch (error) {
      console.error('自动导入失败:', error)
    }
  }

  async function listenImportHotkey() {
    if (isListening) {
      console.log('已在监听快捷键，跳过重复绑定')
      return
    }

    console.log('监听导入委托单快捷键')
    isListening = true

    // 使用具名函数便于移除监听器
    const keydownHandler = async (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key !== 'd') {
        return
      }
      
      event.preventDefault() // 阻止默认的保存行为
      await autoImport()
    }

    document.addEventListener('keydown', keydownHandler)

    // 页面卸载时清理监听器
    window.addEventListener('beforeunload', () => {
      document.removeEventListener('keydown', keydownHandler)
      isListening = false
    })
  }
}

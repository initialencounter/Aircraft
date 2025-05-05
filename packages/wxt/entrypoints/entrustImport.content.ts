import { getClipboardText, sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/sales/entrust/dict/main?callback=entrust_dict_callback'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  chrome.storage.local.get(['autoImport'], async function (result) {
    if (result.autoImport === false) {
      console.log('未启用导入委托单，退出脚本')
      return
    }
    await sleep(400)
    await listenImportHotkey()
  })

  async function autoImport() {
    const projectNo = (await getClipboardText()).replace(/[^0-9A-Z]/g, '')
    console.log('项目编号：', projectNo)
    if (!projectNo) {
      console.log('没有项目编号，退出脚本')
      return
    }
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
    const handle = setInterval(() => {
      const row1 = document.querySelector(
        'body > div > div > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table > tbody > tr:nth-child(1)'
      )
      if (row1) {
        row1.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        clearInterval(handle)
      }
    }, 200)
  }

  async function listenImportHotkey() {
    console.log('监听导入委托单快捷键')
    // 监听 Ctrl+D 键的弹起事件
    document.addEventListener('keydown', async function (event) {
      if (!event.ctrlKey) {
        return
      }
      if (event.key === 'd') {
        event.preventDefault() // 阻止默认的保存行为
        await autoImport()
      }
    })
  }
}

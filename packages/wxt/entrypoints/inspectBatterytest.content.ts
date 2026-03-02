import { sleep } from "../share/utils"

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest*'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  chrome.storage.local.get(['setTitleWithProjectNo'], async (localConfig) => {
    if (!(localConfig.setTitleWithProjectNo === false)) {
      await sleep(500) // 等待页面内容加载
      const projectNoElement = document.querySelector("#projectNo")
      if (projectNoElement) {
        document.title = projectNoElement.innerHTML
      }
    }
  })
}


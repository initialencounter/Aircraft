import { getLocalConfig, getSystemId, sleep } from "../share/utils"
import { switchFaviconBySystemId } from "./modules/ui/favicon"

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest*'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  const localConfig = await getLocalConfig()
  const systemId = getSystemId()
  
  if (!(localConfig.setTitleWithProjectNo === false)) {
    await sleep(500) // 等待页面内容加载
    const projectNoElement = document.querySelector("#projectNo")
    if (projectNoElement) {
      document.title = projectNoElement.innerHTML
    }
  }

  // 自定义图标
  if (localConfig.customIcon) {
    switchFaviconBySystemId(systemId, localConfig)
  }

}


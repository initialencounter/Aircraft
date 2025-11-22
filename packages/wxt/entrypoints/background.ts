


type CreateProperties = chrome.contextMenus.CreateProperties
type ExtendedCreateProperties = CreateProperties & {
  child?: ExtendedCreateProperties[]
}

const IFRAME_RECT_MAP: Record<number, DOMRect> = {}

interface SearchResult {
  name: string
  path: string
}

interface SearchResponse {
  results: SearchResult[]
}

let creating: Promise<void> | null = null;

async function setupOffscreenDocument(path: string) {
  // Check if offscreen API is available
  if (!chrome.offscreen) {
    console.warn('Offscreen API is not available in this browser');
    return;
  }

  const offscreenUrl = chrome.runtime.getURL(path);

  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Run ONNX model',
    });
    await creating;
    creating = null;
  }
}


export default defineBackground({
  main() {
    entrypoint()
  },
})

async function entrypoint() {
  // A generic onclick callback function.
  chrome.contextMenus.onClicked.addListener(genericOnClick)

  setupOffscreenDocument(chrome.runtime.getURL('offscreen.html'));

  // A generic onclick callback function.
  async function genericOnClick(info: chrome.contextMenus.OnClickData) {
    switch (info.menuItemId) {
      case 'lims_onekey_assign':
        sendMessageToActiveTab('lims_onekey_assign')
        break
      case 'wasm测试':
        const pdfBuffer = await downloadEverythingFile('C:/Users/29115/Downloads/SEKGZ202510240668+概要.docx')
        console.log('Downloaded PDF buffer length:', pdfBuffer?.byteLength)
        // 将 ArrayBuffer 转换为数组以便跨上下文传递
        const pdfArray = pdfBuffer ? Array.from(new Uint8Array(pdfBuffer)) : []
        const response4 = await chrome.runtime.sendMessage({
          action: 'parse-pdf',
          input: pdfArray,
        })
        console.log('WASM parse-pdf response:', response4)
        break
      default:
        console.log('Standard context menu item clicked.')
    }
  }

  chrome.runtime.onInstalled.addListener(async function () {
    const version = chrome.runtime.getManifest().version
    await backgroundSleep(500)
    const menus: ExtendedCreateProperties = {
      title: '当前插件版本：' + version,
      id: 'lims',
      child: [
        { title: 'wasm测试', id: 'wasm测试' },
        {
          title: '其他',
          id: 'other_menu',
          child: [
            { title: 'pek1', id: 'pek1' },
            { title: 'pek2', id: 'pek2' },
            {
              title: 'pek3',
              id: 'pek3',
              child: [
                { title: 'pek31', id: 'pek31' },
                { title: 'pek32', id: 'pek32' },
                { title: 'pek33', id: 'pek33' },
              ],
            },
          ],
        },
      ],
    }
    createContextMenu(menus)
  })

  function createContextMenu(
    createProperties: ExtendedCreateProperties,
    id?: number | string
  ) {
    createProperties['parentId'] = id
    const { child, ...properties } = createProperties
    const parentId = chrome.contextMenus.create(properties)
    if (!createProperties.child) {
      return
    }
    for (let i = 0; i < createProperties.child.length; i++) {
      createContextMenu(createProperties.child[i], parentId)
    }
  }

  async function sendMessageToActiveTab(message: string) {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })
    if (!tab.id) return
    await chrome.tabs.sendMessage(tab.id, message)
  }

  async function backgroundSleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function getAttachmentInfo(
    aircraftServer: string,
    projectNo: string,
    label: string,
    is_965: boolean
  ) {
    const response = await fetch(
      `${aircraftServer}/get-attachment-info/${projectNo}?label=${label}&is_965=${is_965 ? 1 : 0}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    )
    if (!response.ok) {
      return null
    }
    return await response.json()
  }

  interface FileData {
    name: string
    type: string
    data: number[]
  }

  async function uploadLLMFiles(aircraftServer: string, files: FileData[]) {
    const formData = new FormData()
    for (const file of files) {
      const uint8Array = new Uint8Array(file.data)
      formData.append(
        'file',
        new Blob([uint8Array], { type: file.type }),
        file.name
      )
    }
    const response = await fetch(`${aircraftServer}/upload-llm-files`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      console.error(`上传失败！${await response.text()}`)
      throw new Error(`上传失败！${await response.text()}`)
    }
    const result = await response.text()
    return result
  }

  async function wasmGetAttachmentInfo(
    projectNo: string,
    label: string,
    is_965: boolean
  ) {
    const attachmentInfo: any = {
      goods: null,
      summary: null,
      other: null,
    };
    const searchRes = await searchAttachment(projectNo)
    if (searchRes === null) {
      console.error('概要结果为空')
      return null
    }
    const goodsPath = await getGoodsPath(searchRes, projectNo)
    if (goodsPath) {
      const goodsBuffer = await downloadEverythingFile(goodsPath)
      if (goodsBuffer) {
        attachmentInfo['goods'] = {
          summary: '',
          labels: label === '1' ? ['label1', 'label2'] : [],
        }
      }
    }
    const summaryPath = await getSummaryPath(searchRes)
    if (summaryPath) {
      const summaryBuffer = await downloadEverythingFile(summaryPath)
      if (summaryBuffer) {
        attachmentInfo['summary'] = {}
      }
    }

    return attachmentInfo
  }

  async function getSummaryPath(searchRes: SearchResponse): Promise<string | null> {
    const attachmentInfo = filterFileExtension(searchRes, '.docx')
    if (attachmentInfo.length === 0) {
      console.error('概要 docx 文件未找到')
      return null
    }
    return `${attachmentInfo[0].path}/${attachmentInfo[0].name}`
  }

  async function getGoodsPath(searchRes: SearchResponse, projectNo: string): Promise<string | null> {
    const attachmentInfo = filterFileExtension(
      searchRes,
      `${projectNo}.pdf`
    )
    if (attachmentInfo.length === 0) {
      console.error('图片 pdf 文件未找到')
      return null
    }
    return `${attachmentInfo[0].path}/${attachmentInfo[0].name}`
  }

  function filterFileExtension(
    searchRes: SearchResponse,
    extension: string
  ): SearchResult[] {
    const res: SearchResult[] = []
    for (const item of searchRes.results) {
      if (item.name.endsWith(extension)) {
        res.push(item)
      }
    }
    return res
  }

  async function searchAttachment(projectNo: string): Promise<SearchResponse | null> {
    try {
      const params = new URLSearchParams({
        search: projectNo,
        json: '1',
        path_column: '1',
      })
      const response = await fetch(`http://127.0.0.1:25456?${params.toString()}`, {
        method: 'GET',
      })
      if (!response.ok) {
        console.error(`搜索失败！${await response.text()}`)
        return null
      }
      const result = await response.json()
      return result
    } catch (error) {
      console.error('搜索异常', error)
      return null
    }
  }

  async function downloadEverythingFile(path: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(`http://127.0.0.1:25456/${path}`, {
        method: 'GET',
        headers: {
          responseType: 'arraybuffer',
        }
      })
      if (!response.ok) {
        console.error(`下载失败！${await response.text()}`)
        return null
      }
      const result = await response.arrayBuffer()
      return result
    } catch (error) {
      console.error('搜索异常', error)
      return null
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAttachmentInfo') {
      getAttachmentInfo(
        request.aircraftServer,
        request.projectNo,
        request.label,
        request.is_965
      )
        .then((result) => sendResponse(result))
        .catch((_error) => sendResponse(null))
      return true // 保持消息通道开放，等待异步响应
    }

    if (request.action === 'uploadLLMFiles') {
      uploadLLMFiles(request.aircraftServer, request.files)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse(error))
      return true // 保持消息通道开放，等待异步响应
    }

    if (request.action === 'search') {
      const result = searchAttachment(request.projectNo)
      console.log('search result promise:', result)
      if (result) {
        result
          .then((res) => sendResponse(res))
          .catch((error) => sendResponse({ error: error.message }))
      }
      return true // 保持消息通道开放，等待异步响应
    }

    // 截图
    if (request.action === 'captureVisibleTab') {
      chrome.tabs.captureVisibleTab(
        { format: 'png', quality: 100 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error(
              'chrome.runtime.lastError',
              chrome.runtime.lastError.message
            )
            sendResponse({ error: chrome.runtime.lastError.message })
          } else {
            console.log('dataUrl:', dataUrl)
            sendResponse(dataUrl)
          }
        }
      )
      return true // 保持异步响应
    }

    // 同步 iframe 的 rect
    if (request.action === 'syncIframeRect') {
      IFRAME_RECT_MAP[sender.tab!.id!] = request.rect
      sendResponse('ok')
      return true // 保持消息通道开放，等待异步响应
    }

    if (request.action === 'getIframeRect') {
      sendResponse(
        IFRAME_RECT_MAP[sender.tab!.id!] ||
        DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
      )
      return true // 保持消息通道开放，等待异步响应
    }
  })
}

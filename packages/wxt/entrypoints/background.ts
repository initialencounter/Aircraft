import { GoodsInfo, OtherInfo, SegmentResult } from 'aircraft-rs';
import type { GoodsInfoWasm, SummaryInfo } from '../public/aircraft';



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

interface SearchPathResult {
  type: string
  name: string
  path: string
}

interface SearchPathResponse {
  totalResults: number
  results: SearchPathResult[]
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

let aircraftServerAvailable = true;
async function entrypoint() {
  chrome.storage.local.get('allInWebBrowser').then((result) => {
    if (result.allInWebBrowser !== false) {
      aircraftServerAvailable = false
      console.log('allInWebBrowser is true, Loading offscreen document')
      setupOffscreenDocument(chrome.runtime.getURL('offscreen.html'));
    }
  })
  // A generic onclick callback function.
  chrome.contextMenus.onClicked.addListener(genericOnClick)


  // A generic onclick callback function.
  async function genericOnClick(info: chrome.contextMenus.OnClickData) {
    switch (info.menuItemId) {
      case 'lims_onekey_assign':
        sendMessageToActiveTab('lims_onekey_assign')
        break
      case 'pdf测试':
        const pdfBuffer = await downloadEverythingFile("C:/Users/29115/Downloads/upload/SEKGZ202508140000.pdf")
        const response4: GoodsInfo = await getGoodsInfo(pdfBuffer!, true, false)
        console.log('WASM get-goods response:', response4)
        break

      case '概要测试':
        const summaryBuffer = await downloadEverythingFile("C:/Users/29115/Downloads/upload/SEKGZ202508140000 概要.docx")
        let responseSummary: SummaryInfo = await getSummaryInfo(summaryBuffer!)
        console.log('WASM get-summary response:', responseSummary)
        break

      case 'yolo测试':
        const imgBuffer = await downloadEverythingFile("C:/Users/29115/Downloads/upload/000.png")
        const imgArray = Array.from(new Uint8Array(imgBuffer!))
        const responseYolo = await getYOLOSegmentResults(imgArray, true)
        console.log('WASM yolo response:', responseYolo)
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
        { title: 'pdf测试', id: 'pdf测试' },
        { title: '概要测试', id: '概要测试' },
        { title: 'yolo测试', id: 'yolo测试' },
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

  async function pingServer(aircraftServer: string): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000) // 50ms超时

      const response = await fetch(`${aircraftServer}/ping`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return false
      }
      const result = await response.json()
      return result === 'pong'
    } catch (error) {
      console.error('Ping server failed:', error)
      return false
    }
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
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
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
    label: boolean,
    is_965: boolean
  ) {
    console.log('WASM getAttachmentInfo called', projectNo, label, is_965)
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
        attachmentInfo['goods'] = await getGoodsInfo(goodsBuffer, label, is_965)
      }
    }
    const summaryPath = await getSummaryPath(searchRes)
    if (summaryPath) {
      const summaryBuffer = await downloadEverythingFile(summaryPath)
      if (summaryBuffer) {
        attachmentInfo['summary'] = await getSummaryInfo(summaryBuffer)
      }
    }

    attachmentInfo['other'] = await getOtherInfo(projectNo)
    return attachmentInfo
  }

  async function getSummaryInfo(summaryBuffer: ArrayBuffer): Promise<SummaryInfo> {
    const summaryArray = Array.from(new Uint8Array(summaryBuffer))
    const response: SummaryInfo = await chrome.runtime.sendMessage({
      action: 'get_summary_info_wasm',
      input: summaryArray,
    })
    return response
  }

  async function getGoodsInfo(pdfBuffer: ArrayBuffer, label: boolean, is_965: boolean): Promise<GoodsInfo> {
    const pdfArray = Array.from(new Uint8Array(pdfBuffer))
    const res: GoodsInfoWasm = await chrome.runtime.sendMessage({
      action: 'get_goods_info_wasm',
      input: pdfArray,
      is_965,
    })
    const { labels, segmentResults } = await getYOLOSegmentResults(res.image, label)
    return {
      projectNo: res.project_no,
      itemCName: res.item_c_name,
      labels: labels,
      packageImage: res.image ?? undefined,
      segmentResults: segmentResults,
    }
  }

  async function getOtherInfo(projectNo: string): Promise<OtherInfo | null> {
    const fileItems = await getProjectDirItems(projectNo)
    for (const file of fileItems?.results || []) {
      if (file.type === 'dir') continue
      if (file.name.includes('评估单') || file.name.includes('堆码评估')) {
        return {
          stackEvaluation: true,
          projectDir: file.path,
        }
      }
    }
    return null;
  }

  async function getYOLOSegmentResults(image: Array<number> | null, label: boolean) {
    const labels: string[] = []
    const segmentResults: any[] = []

    if (!image || !label) return { labels, segmentResults }
    const yoloResponse: {
      result: SegmentResult[]
    } = await chrome.runtime.sendMessage({
      action: 'yolo-inference',
      input: image,
    })

    console.log('YOLO inference response:', yoloResponse)
    for (const item of yoloResponse.result) {
      if (item.confidence > 0.5) {
        labels.push(item.label)
        segmentResults.push(item)
      }
    }
    console.log('Detected labels:', labels)

    return { labels, segmentResults }
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

  async function getProjectDirItems(projectNo: string): Promise<SearchPathResponse | null> {
    try {
      const searchResponses: SearchResponse | null = await searchAttachment(projectNo + '.doc')
      if (searchResponses === null || searchResponses.results.length === 0) {
        console.error('搜索结果为空')
        return null
      }
      const projectDir = searchResponses.results[0].path
      const pathResponses: SearchPathResponse | null = await searchEverythinPacth(projectDir)
      if (pathResponses === null || pathResponses.totalResults === 0) {
        console.error('路径搜索结果为空')
        return null
      }
      return pathResponses
    } catch (error) {
      console.error('获取项目目录文件名异常', error)
      return null
    }
  }

  async function searchEverythinPacth(path: string): Promise<SearchPathResponse | null> {
    try {
      const params = new URLSearchParams({
        search: path,
        json: '1',
        path: '1',
      })
      const response = await fetch(`http://127.0.0.1:25456?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
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

  async function searchAttachment(projectNo: string): Promise<SearchResponse | null> {
    try {
      const params = new URLSearchParams({
        search: projectNo,
        json: '1',
        path_column: '1',
      })
      const response = await fetch(`http://127.0.0.1:25456?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!response.ok) {
        console.error(`搜索失败！${await response.text()}`)
        return null
      }
      const result = await response.json()
      console.log('searchAttachment result:', result)
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
        cache: 'no-store',
        mode: 'cors',
        headers: {
          responseType: 'arraybuffer',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
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
    // 代理获取 enableLabelCheck
    if (request.action === 'getEnableLabelCheck') {
      chrome.storage.local.get('enableLabelCheck').then((result) => {
        sendResponse(result)
      }).catch((error) => {
        console.error('获取 enableLabelCheck 失败:', error)
        sendResponse({ enableLabelCheck: true }) // 默认值
      })
      return true // 保持消息通道开放，等待异步响应
    }

    if (request.action === 'getAttachmentInfo') {
      if (aircraftServerAvailable) {
        console.log('Server is available, using getAttachmentInfo')
        getAttachmentInfo(
          request.aircraftServer,
          request.projectNo,
          request.label,
          request.is_965
        ).then((result) => sendResponse(result))
          .catch((_error) => sendResponse(null))
      } else {
        console.log('Server is not available, using wasmGetAttachmentInfo')
        wasmGetAttachmentInfo(
          request.projectNo,
          request.label,
          request.is_965
        ).then((result) => sendResponse(result))
          .catch((_error) => sendResponse(null))
      }
      return true // 保持消息通道开放,等待异步响应
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

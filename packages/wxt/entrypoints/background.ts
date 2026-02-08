import type { AttachmentInfo, GoodsInfo, OtherInfo, SegmentResult } from 'aircraft-rs';
import type { GoodsInfoWasm, SummaryInfo } from '../public/aircraft';
import * as ort from "onnxruntime-web/wasm";
import { predict_yolo26 } from '../share/yolo';
import type * as Aircraft from '../public/aircraft';
import init, * as AircraftWasm from '../public/aircraft.js';


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

const EVERYTHING_HTTP_ADDRESS = "http://127.0.0.1:25456";

let session: ort.InferenceSession | null = null;
let wasmModule: typeof Aircraft;
let creating: Promise<void> | null = null;

let ortIsInitialized = false;
let aircraftServerAvailable = true;
let enableLabelCheck = false;
// 检测浏览器类型
const isFirefox = typeof browser !== "undefined";
let useWebGPU = !isFirefox;

// 创建 Offscreen Document（仅 Chrome）
async function setupOffscreenDocument(path: string) {
  // Check if offscreen API is available
  if (!chrome.offscreen) {
    console.warn('Offscreen API is not available in this browser');
    return;
  }

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

// 初始化 ONNX 模型（Firefox 使用 WASM 后端）
async function initializeModel() {
  try {
    const modelUrl = chrome.runtime.getURL('segment.onnx');
    ort.env.wasm.simd = true;
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
    });
    ortIsInitialized = true;
    console.log("ONNX Model loaded successfully in background with WASM backend (Firefox)");
  } catch (e) {
    console.error("Model loading error:", e);
    ortIsInitialized = false;
  }
}


async function initAircraftWasm() {
  try {
    const wasmURL = chrome.runtime.getURL('aircraft_bg.wasm');
    await init(wasmURL);
    wasmModule = AircraftWasm as any;
    console.log('Aircraft WASM initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Aircraft WASM:', error);
  }
}

function startHeartbeat() {
  // 每20秒发送一次心跳
  setInterval(() => {
    console.log('Service Worker heartbeat:', new Date().toISOString());
    // 可以执行一些轻量级操作来保持活跃
    chrome.runtime.getPlatformInfo().catch(() => { });
  }, 20000) as unknown as number;
}

export default defineBackground({
  main() {
    entrypoint()
  },
})


async function entrypoint() {
  try {
    // 启动心跳
    startHeartbeat();
    chrome.storage.local.get(['allInWebBrowser', 'enableLabelCheck']).then((result) => {
      if (result.allInWebBrowser !== false) {
        aircraftServerAvailable = false
        initAircraftWasm().catch(err => console.error('initAircraftWasm failed:', err));
      }
      if (result.enableLabelCheck === true) {
        enableLabelCheck = true
        if (useWebGPU) {
          setupOffscreenDocument(chrome.runtime.getURL('offscreen.html'));
        } else {
          initializeModel().catch(err => console.error('initializeModel failed:', err));
        }
      }
    }).catch(err => console.error('chrome.storage.local.get failed:', err))
    chrome.contextMenus.onClicked.addListener(genericOnClick)
  } catch (error) {
    console.error('entrypoint initialization error:', error);
  }


  // A generic onclick callback function.
  async function genericOnClick(info: chrome.contextMenus.OnClickData) {
    try {
      switch (info.menuItemId) {
        case 'lims_onekey_assign':
          await sendMessageToActiveTab('lims_onekey_assign')
          break
        case 'pdf测试':
          const pdfBuffer = await downloadEverythingFile("C:/Users/29115/Downloads/upload/SEKGZ202508140000.pdf")
          const response4: GoodsInfo = await getGoodsInfo(pdfBuffer!, false)
          console.log('WASM get-goods response:', response4)
          break

        case '概要测试':
          const summaryBuffer = await downloadEverythingFile("E:\\2025\\11\\2026\\11.10安磁 新出 2026（9份）\\A25090200-6 嘉成 112028 空海运\\PEKGZ202511115345 概要.docx")
          let responseSummary: SummaryInfo | null = await getSummaryInfo(summaryBuffer!)
          console.log('WASM get-summary response:', responseSummary)
          break

        case 'yolo测试':
          const imgBuffer = await downloadEverythingFile("C:/Users/29115/Downloads/upload/000.png")
          console.time("yolo测试")
          for (let i = 0; i < 100; i++) {
            const responseYolo = await getYOLOSegmentResults(Array.from(new Uint8Array(imgBuffer!)), true)
            console.log('WASM yolo response:', i, responseYolo.labels)
          }
          console.timeEnd("yolo测试")
          break
        default:
          console.log('Standard context menu item clicked.')
      }
    } catch (error) {
      console.error('genericOnClick error:', error);
    }
  }

  chrome.runtime.onInstalled.addListener(async function () {
    try {
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
    } catch (error) {
      console.error('onInstalled error:', error);
    }
  })

  function createContextMenu(
    createProperties: ExtendedCreateProperties,
    id?: number | string
  ) {
    try {
      createProperties['parentId'] = id
      const { child, ...properties } = createProperties
      const parentId = chrome.contextMenus.create(properties)
      if (!createProperties.child) {
        return
      }
      for (let i = 0; i < createProperties.child.length; i++) {
        createContextMenu(createProperties.child[i], parentId)
      }
    } catch (error) {
      console.error('createContextMenu error:', error);
    }
  }

  async function sendMessageToActiveTab(message: string) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      })
      if (!tab.id) return
      await chrome.tabs.sendMessage(tab.id, message)
    } catch (error) {
      console.error('sendMessageToActiveTab error:', error);
    }
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
    try {
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
    } catch (error) {
      console.error('getAttachmentInfo error:', error);
      return null;
    }
  }

  async function wasmGetAttachmentInfo(
    projectNo: string,
    label: boolean,
    is_965: boolean
  ) {
    try {
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
          attachmentInfo['goods'] = await getGoodsInfo(goodsBuffer, is_965)
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
    } catch (error) {
      console.error('wasmGetAttachmentInfo error:', error);
      return null;
    }
  }

  async function getSummaryInfo(summaryBuffer: ArrayBuffer): Promise<SummaryInfo | null> {
    try {
      const summaryArray = new Uint8Array(summaryBuffer)
      return wasmModule.get_summary_info(summaryArray);
    }
    catch (error) {
      console.error('getSummaryInfo error:', error);
      return null;
    }
  }

  async function getGoodsInfo(pdfBuffer: ArrayBuffer, is_965: boolean): Promise<GoodsInfo> {
    try {
      const pdfArray = new Uint8Array(pdfBuffer)
      const res: GoodsInfoWasm = wasmModule.get_goods_info(pdfArray, is_965);

      return {
        projectNo: res.project_no,
        itemCName: res.item_c_name,
        labels: [],
        packageImage: res.image ?? undefined,
        segmentResults: [],
      }
    } catch (error) {
      console.error('getGoodsInfo error:', error);
      return {
        projectNo: '',
        itemCName: '',
        labels: [],
        packageImage: undefined,
        segmentResults: [],
      }
    }

  }

  async function getOtherInfo(projectNo: string): Promise<OtherInfo | null> {
    try {
      const searchResponses: SearchResponse | null = await searchAttachment(projectNo + '.doc')
      if (!searchResponses?.results?.[0]) {
        console.error('搜索结果为空')
        return {
          stackEvaluation: false,
          projectDir: '',
        }
      }
      const projectDir = searchResponses.results[0].path
      const fileItems = await getProjectDirItems(projectDir)
      for (const file of fileItems?.results || []) {
        if (file.path !== projectDir) continue
        if (file.type === 'dir') continue
        if (file.name.includes('评估单') || file.name.includes('堆码评估')) {
          return {
            stackEvaluation: true,
            projectDir: projectDir,
          }
        }
      }
      return {
        stackEvaluation: false,
        projectDir: projectDir,
      }
    } catch (error) {
      console.error('getOtherInfo error:', error);
      return {
        stackEvaluation: false,
        projectDir: '',
      };
    }
  }

  async function getYOLOSegmentResults(image: Array<number> | null, label: boolean) {
    try {
      const labels: string[] = []
      const segmentResults: any[] = []

      if (!image || !label) return { labels, segmentResults }

      let result;
      if (useWebGPU) {
        result = await predictWithOffscreen(image);
      } else {
        if (!ortIsInitialized) {
          console.error('ONNX Runtime is not initialized, cannot perform YOLO inference');
        }
        result = await predict_yolo26(session, Uint8Array.from(image));
      }

      console.log('YOLO inference response:', result)
      for (const item of result) {
        if (item.confidence > 0.5) {
          if (!labels.includes(item.label)) {
            labels.push(item.label)
          }
          segmentResults.push(item)
        }
      }
      console.log('Detected labels:', labels)

      return { labels, segmentResults }
    } catch (error) {
      console.error('getYOLOSegmentResults error:', error);
      return { labels: [], segmentResults: [] };
    }
  }

  async function predictWithOffscreen(image: Array<number>): Promise<SegmentResult[]> {
    const result = await chrome.runtime.sendMessage({
      action: 'yolo-inference',
      input: image,
    });
    console.log('Received YOLO inference result from offscreen:', result);
    return result.result;
  }


  async function getSummaryPath(searchRes: SearchResponse): Promise<string | null> {
    try {
      const attachmentInfo = filterFileExtension(searchRes, '.docx')
      if (attachmentInfo.length === 0) {
        console.error('概要 docx 文件未找到')
        return null
      }
      return `${attachmentInfo[0].path}/${attachmentInfo[0].name}`
    } catch (error) {
      console.error('getSummaryPath error:', error);
      return null;
    }
  }

  async function getGoodsPath(searchRes: SearchResponse, projectNo: string): Promise<string | null> {
    try {
      const attachmentInfo = filterFileExtension(
        searchRes,
        `${projectNo}.pdf`
      )
      if (attachmentInfo.length === 0) {
        console.error('图片 pdf 文件未找到')
        return null
      }
      return `${attachmentInfo[0].path}/${attachmentInfo[0].name}`
    } catch (error) {
      console.error('getGoodsPath error:', error);
      return null;
    }
  }

  function filterFileExtension(
    searchRes: SearchResponse,
    extension: string
  ): SearchResult[] {
    try {
      const res: SearchResult[] = []
      for (const item of searchRes.results) {
        if (item.name.endsWith(extension)) {
          res.push(item)
        }
      }
      return res
    } catch (error) {
      console.error('filterFileExtension error:', error);
      return [];
    }
  }

  async function getProjectDirItems(projectDir: string): Promise<SearchPathResponse | null> {
    try {
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
        path_column: '1',
      })
      const response = await fetch(`${EVERYTHING_HTTP_ADDRESS}?${params.toString()}`, {
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
      const response = await fetch(`${EVERYTHING_HTTP_ADDRESS}?${params.toString()}`, {
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
      const response = await fetch(`${EVERYTHING_HTTP_ADDRESS}/${path}`, {
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
      console.error('下载异常', error)
      return null
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request.action === 'getAttachmentInfo') {
        (async () => {
          let attachmentInfo: AttachmentInfo;
          if (aircraftServerAvailable) {
            console.log('Server is available, using getAttachmentInfo')
            attachmentInfo = await getAttachmentInfo(
              request.aircraftServer,
              request.projectNo,
              request.label,
              request.is_965
            )
          } else {
            console.log('Server is not available, using wasmGetAttachmentInfo')
            attachmentInfo = await wasmGetAttachmentInfo(
              request.projectNo,
              request.label,
              request.is_965
            )
          }
          if (!attachmentInfo?.goods?.packageImage || !enableLabelCheck) {
            sendResponse(attachmentInfo);
            return;
          }
          const yoloResults = await getYOLOSegmentResults(attachmentInfo.goods.packageImage, request.label)
          attachmentInfo.goods.labels = yoloResults.labels
          attachmentInfo.goods.segmentResults = yoloResults.segmentResults
          sendResponse(attachmentInfo)
        })();
        return true // 保持消息通道开放,等待异步响应
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
    } catch (error) {
      console.error('chrome.runtime.onMessage error:', error);
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    }
    return false
  })
}

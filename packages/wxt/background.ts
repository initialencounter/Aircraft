import type { AttachmentInfo, GoodsInfo, OtherInfo, SegmentResult } from 'aircraft-rs';
import type { GoodsInfoWasm, SummaryInfo } from './public/aircraft';
import * as ort from "onnxruntime-web/wasm";
import {
  createPPOcrRuntime,
  recognizeTextDebugFromImageBytes,
  recognizeTextFromImageBytes,
  type PPOcrDebugResult,
  type PPOcrRecognizeOptions,
  type PPOcrRuntime,
} from './share/ppocr';
import { predict_yolo26, type YoloPredictOptions } from './share/yolo';
import type * as Aircraft from './public/aircraft';
import init, * as AircraftWasm from './public/aircraft.js';


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
let ppocrRuntime: PPOcrRuntime | null = null;

let ortIsInitialized = false;
let aircraftServerAvailable = true;
let enableLabelCheck = false;

type SegmentResultWithOcr = SegmentResult & {
  ocrText?: string
}

interface DebugYoloResult {
  elapsedMs: number
  iterations: number
  averageMs: number
  labels: string[]
  segmentResults: SegmentResult[]
}

interface DebugPPOcrResult extends PPOcrDebugResult {
  elapsedMs: number
  iterations: number
  averageMs: number
}

// @ts-ignore
let useWebGPU = chrome.runtime.getManifest()?.web_accessible_resources[0].resources.includes('model.js');

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
    ort.env.wasm.wasmPaths = {
      wasm: chrome.runtime.getURL('ort-wasm-simd-threaded.wasm'),
    }
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

async function initializePPOcrModel() {
  try {
    ppocrRuntime = await createPPOcrRuntime(ort, {
      detModelUrl: chrome.runtime.getURL('en_PP-OCRv3_det.onnx'),
      recModelUrl: chrome.runtime.getURL('en_PP-OCRv4_rec.onnx'),
      dictUrl: chrome.runtime.getURL('dict.txt'),
      executionProviders: ['wasm'],
      wasmConfig: {
        simd: true,
        numThreads: 1,
        wasmPaths: {
          wasm: chrome.runtime.getURL('ort-wasm-simd-threaded.wasm'),
        },
      },
    })
    console.log('PPOCR loaded successfully in background with single-thread WASM backend (Firefox)')
  } catch (e) {
    console.error('PPOCR loading error:', e)
    ppocrRuntime = null
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

entrypoint()


async function entrypoint() {
  try {
    // 启动心跳
    startHeartbeat();
    chrome.storage.local.get(['allInWebBrowser', 'enableLabelCheck']).then((result) => {
      if (result.allInWebBrowser !== false) {
        aircraftServerAvailable = false
        initAircraftWasm().catch(err => console.error('initAircraftWasm failed:', err));
      }
      if (!(result.enableLabelCheck === false)) {
        enableLabelCheck = true
        if (useWebGPU) {
          setupOffscreenDocument(chrome.runtime.getURL('offscreen.html'));
        } else {
          initializeModel().catch(err => console.error('initializeModel failed:', err));
          initializePPOcrModel().catch(err => console.error('initializePPOcrModel failed:', err));
        }
      }
    }).catch(err => console.error('chrome.storage.local.get failed:', err))
  } catch (error) {
    console.error('entrypoint initialization error:', error);
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

  async function wasmGetAttachmentInfo(projectNo: string, is_965: boolean) {
    try {
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
      const projectDir = searchRes.results[0].path
      const [goodsPath, summaryPath] = await Promise.all([getGoodsPath(searchRes, projectNo), getSummaryPath(searchRes)])

      const [goodsBuffer, summaryBuffer, fileItems] = await Promise.all([
        goodsPath ? downloadEverythingFile(goodsPath) : Promise.resolve(null),
        summaryPath ? downloadEverythingFile(summaryPath) : Promise.resolve(null),
        getProjectDirItems(projectDir),
      ]);

      const [attachmentInfoGoods, attachmentInfoSummary] = await Promise.all([
        goodsBuffer ? getGoodsInfo(goodsBuffer, is_965) : Promise.resolve(null),
        summaryBuffer ? getSummaryInfo(summaryBuffer) : Promise.resolve(null),
      ])

      attachmentInfo['goods'] = attachmentInfoGoods
      attachmentInfo['summary'] = attachmentInfoSummary
      attachmentInfo['other'] = await getOtherInfo(fileItems, projectDir)
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

  async function getOtherInfo(fileItems: SearchPathResponse | null, projectDir: string): Promise<OtherInfo | null> {
    if (fileItems === null) {
      return {
        stackEvaluation: false,
        projectDir: '',
      }
    }
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
  }

  async function getSegmentResults(image: Array<number> | null, label: boolean) {
    try {
      const labels: string[] = []
      const segmentResults: SegmentResultWithOcr[] = []
      if (!image || !label) return { labels, segmentResults }
      const responseYolo = await getYOLOSegmentResults(image, true)

      let labelBtyIndex = 0
      for (const item of responseYolo.segmentResults) {
        if (item.label === 'bty') {
          let fixedLabel = 'bty'
          const OCRResults = await recognizeBtyText(image, item.polygon)
          if (OCRResults?.includes('3090')) {
            fixedLabel = 'UN3090'
          } else if (OCRResults?.includes('3091')) {
            fixedLabel = 'UN3091'
          } else if (OCRResults?.includes('3480')) {
            fixedLabel = 'UN3480'
          } else if (OCRResults?.includes('3481')) {
            fixedLabel = 'UN3481'
          } else if (OCRResults?.includes('3551')) {
            fixedLabel = 'UN3551'
          } else if (OCRResults?.includes('3552')) {
            fixedLabel = 'UN3552'
          }
          labels[labelBtyIndex] = fixedLabel
          segmentResults[labelBtyIndex] = { ...item, label: fixedLabel, ocrText: OCRResults }
        }
        else {
          labels[labelBtyIndex] = item.label
          segmentResults[labelBtyIndex] = item
        }
        labelBtyIndex++
      }

      return { labels, segmentResults }
    } catch (error) {
      console.error('getSegmentResults error:', error);
      return { labels: [], segmentResults: [] };
    }
  }

  async function getYOLOSegmentResults(
    image: Array<number> | null,
    label: boolean,
    options?: YoloPredictOptions,
  ) {
    try {
      const labels: string[] = []
      const segmentResults: SegmentResultWithOcr[] = []

      if (!image || !label) return { labels, segmentResults }

      let result;
      if (useWebGPU) {
        result = await predictWithOffscreen(image);
      } else {
        if (!ortIsInitialized) {
          console.error('ONNX Runtime is not initialized, cannot perform YOLO inference');
        }
        result = await predict_yolo26(session, Uint8Array.from(image), ort.Tensor, options);
      }

      for (const item of result) {
        if (item.confidence > 0.25) {
          labels.push(item.label)
          segmentResults.push(item)
        }
      }


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
      options: undefined,
    });
    return result.result;
  }

  async function predictWithOffscreenDebug(
    image: Array<number>,
    options?: YoloPredictOptions,
  ): Promise<SegmentResult[]> {
    const result = await chrome.runtime.sendMessage({
      action: 'yolo-inference',
      input: image,
      options,
    })
    return result.result
  }

  async function predictPPOcrWithOffscreen(image: Array<number>, polygon: number[][]): Promise<string> {
    const result = await chrome.runtime.sendMessage({
      action: 'ppocr-inference',
      input: image,
      polygon,
      options: undefined,
    })
    return typeof result === 'string' ? result : ''
  }

  async function predictPPOcrDebugWithOffscreen(
    image: Array<number>,
    polygon?: number[][],
    options?: PPOcrRecognizeOptions,
  ): Promise<PPOcrDebugResult> {
    const result = await chrome.runtime.sendMessage({
      action: 'ppocr-debug-inference',
      input: image,
      polygon,
      options,
    })
    return result as PPOcrDebugResult
  }

  async function recognizeBtyText(image: Array<number>, polygon: number[][]): Promise<string> {
    try {
      if (!polygon.length) {
        return ''
      }

      if (useWebGPU) {
        return await predictPPOcrWithOffscreen(image, polygon)
      }

      if (!ppocrRuntime) {
        console.error('PPOCR Runtime is not initialized, cannot perform OCR inference')
        return ''
      }

      return await recognizeTextFromImageBytes(Uint8Array.from(image), ppocrRuntime, polygon)
    } catch (error) {
      console.error('recognizeBtyText error:', error)
      return ''
    }
  }

  async function runDebugYolo(
    image: Array<number>,
    iterations: number,
    options?: YoloPredictOptions,
  ): Promise<DebugYoloResult> {
    const safeIterations = Math.max(1, Math.floor(iterations))
    let segmentResults: SegmentResult[] = []
    const start = performance.now()

    for (let index = 0; index < safeIterations; index += 1) {
      const currentResults = useWebGPU
        ? await predictWithOffscreenDebug(image, options)
        : await predict_yolo26(session, Uint8Array.from(image), ort.Tensor, options)
      if (index === safeIterations - 1) {
        segmentResults = currentResults
      }
    }

    const elapsedMs = performance.now() - start
    return {
      elapsedMs,
      iterations: safeIterations,
      averageMs: elapsedMs / safeIterations,
      labels: [...new Set(segmentResults.map((item) => item.label))],
      segmentResults,
    }
  }

  async function runDebugPPOcr(
    image: Array<number>,
    polygon: number[][] | undefined,
    iterations: number,
    options?: PPOcrRecognizeOptions,
  ): Promise<DebugPPOcrResult> {
    const safeIterations = Math.max(1, Math.floor(iterations))
    let result: PPOcrDebugResult = {
      text: '',
      imageWidth: 0,
      imageHeight: 0,
      detectWidth: 0,
      detectHeight: 0,
      lines: [],
    }
    const start = performance.now()

    for (let index = 0; index < safeIterations; index += 1) {
      const currentResult = useWebGPU
        ? await predictPPOcrDebugWithOffscreen(image, polygon, options)
        : await recognizeTextDebugFromImageBytes(Uint8Array.from(image), ppocrRuntime!, polygon, options)
      if (index === safeIterations - 1) {
        result = currentResult
      }
    }

    const elapsedMs = performance.now() - start
    return {
      ...result,
      elapsedMs,
      iterations: safeIterations,
      averageMs: elapsedMs / safeIterations,
    }
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
      const pathResponses: SearchPathResponse | null = await searchEverythingPath(projectDir)
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

  async function searchEverythingPath(path: string): Promise<SearchPathResponse | null> {
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

  async function warmUp(projectNo: string) {
    console.time('warmUp')
    await searchAttachment(
      projectNo,
    )
    console.timeEnd('warmUp')
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
              request.is_965
            )
          }
          if (!attachmentInfo?.goods?.packageImage || !enableLabelCheck) {
            sendResponse(attachmentInfo);
            return;
          }
          const yoloResults = await getSegmentResults(attachmentInfo.goods.packageImage, request.label)
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

      if (request.action === 'warmUp') {
        warmUp(request.projectNo)
        sendResponse('ok')
        return true // 保持消息通道开放，等待异步响应
      }

      if (request.action === 'get-summary-info') {
        (async () => {
          const summaryInfo = await getSummaryInfo(Uint8Array.from(request.summaryBytes ?? []).buffer)
          sendResponse(summaryInfo)
        })();
        return true
      }

      if (request.action === 'get-goods-info') {
        (async () => {
          const goodsInfo = await getGoodsInfo(Uint8Array.from(request.pdfBytes ?? []).buffer, request.is_965 ?? false)
          sendResponse(goodsInfo)
        })()
        return true
      }

      if (request.action === 'debug-yolo') {
        (async () => {
          const result = await runDebugYolo(
            request.image,
            request.iterations ?? 1,
            request.options,
          )
          sendResponse(result)
        })()
        return true
      }

      if (request.action === 'debug-ppocr') {
        (async () => {
          if (!useWebGPU && !ppocrRuntime) {
            sendResponse({
              text: '',
              imageWidth: 0,
              imageHeight: 0,
              detectWidth: 0,
              detectHeight: 0,
              lines: [],
              preparedImage: null,
              elapsedMs: 0,
              iterations: 0,
              averageMs: 0,
            })
            return
          }
          const result = await runDebugPPOcr(
            request.image,
            request.polygon,
            request.iterations ?? 1,
            request.options,
          )
          sendResponse(result)
        })()
        return true
      }
    } catch (error) {
      console.error('chrome.runtime.onMessage error:', error);
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    }
    return false
  })
}

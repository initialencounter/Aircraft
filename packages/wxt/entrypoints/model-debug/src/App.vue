<template>
  <main class="debug-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Background Debug</p>
        <h1>模型与附件调试页</h1>
        <p class="hero-copy">
          直接调用 background 中的调试接口，替代 contextMenus
          里写死的本地测试文件。
        </p>
      </div>
      <el-tag type="success" effect="dark">测试页已构建</el-tag>
    </section>

    <section class="panel-grid two-column">
      <el-card class="panel-card">
        <template #header>
          <div class="panel-header">
            <span>图片 PDF 解析</span>
            <el-tag size="small">getGoodsInfo</el-tag>
          </div>
        </template>
        <el-upload
          class="dropzone"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf,application/pdf"
          :on-change="handleGoodsFileChange"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽 PDF 到这里，或点击选择文件</div>
          <template #tip>
            <div class="upload-tip">
              当前文件：{{ goodsFileName || '未选择' }}
            </div>
          </template>
        </el-upload>
        <div class="inline-controls compact-gap">
          <el-switch
            v-model="goodsIs965"
            inline-prompt
            active-text="965"
            inactive-text="非965"
          />
          <el-button
            type="primary"
            :loading="goodsLoading"
            @click="runGoodsTest"
            >开始解析</el-button
          >
        </div>
        <pre class="result-block">{{ goodsResultText }}</pre>
      </el-card>

      <el-card class="panel-card">
        <template #header>
          <div class="panel-header">
            <span>概要解析</span>
            <el-tag size="small">getSummaryInfo</el-tag>
          </div>
        </template>
        <el-upload
          class="dropzone"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".doc,.docx,.zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          :on-change="handleSummaryFileChange"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽概要文件到这里，或点击选择文件</div>
          <template #tip>
            <div class="upload-tip">
              当前文件：{{ summaryFileName || '未选择' }}
            </div>
          </template>
        </el-upload>
        <div class="inline-controls compact-gap">
          <el-button
            type="primary"
            :loading="summaryLoading"
            @click="runSummaryTest"
            >开始解析</el-button
          >
        </div>
        <pre class="result-block">{{ summaryResultText }}</pre>
      </el-card>
    </section>

    <section class="panel-grid">
      <el-card class="panel-card wide-card">
        <template #header>
          <div class="panel-header">
            <span>YOLO 调试</span>
            <el-tag size="small">debug-yolo</el-tag>
          </div>
        </template>

        <el-upload
          class="dropzone"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          :on-change="handleImageFileChange"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            拖拽图片到这里，YOLO 与 PPOCR 共用同一张图
          </div>
          <template #tip>
            <div class="upload-tip">
              当前文件：{{ imageFileName || '未选择' }}
            </div>
          </template>
        </el-upload>

        <div class="controls-grid">
          <el-form label-position="top" class="control-form">
            <el-form-item label="置信度阈值">
              <el-input-number
                v-model="yoloForm.confidenceThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :precision="2"
              />
            </el-form-item>
            <el-form-item label="性能迭代次数">
              <el-input-number
                v-model="yoloForm.iterations"
                :min="1"
                :max="500"
                :step="1"
              />
            </el-form-item>
          </el-form>

          <div class="actions-column">
            <el-button
              type="primary"
              size="large"
              :loading="yoloLoading"
              @click="runYoloTest"
              >运行 YOLO</el-button
            >
            <el-button @click="usePackageImage">使用 packageImage</el-button>
            <el-button @click="clearYoloResults">清空结果</el-button>
            <div class="metric-row">
              <el-statistic
                title="总耗时(ms)"
                :value="yoloResult?.elapsedMs ?? 0"
                :precision="2"
              />
              <el-statistic
                title="平均耗时(ms)"
                :value="yoloResult?.averageMs ?? 0"
                :precision="2"
              />
              <el-statistic
                title="检测数量"
                :value="yoloResult?.segmentResults.length ?? 0"
              />
            </div>
          </div>
        </div>

        <div class="canvas-shell" v-if="imagePreviewUrl || yoloResult">
          <canvas ref="yoloCanvasRef" class="result-canvas"></canvas>
        </div>

        <el-table
          v-if="yoloResult?.segmentResults.length"
          :data="yoloResult.segmentResults"
          stripe
        >
          <el-table-column prop="label" label="标签" width="120" />
          <el-table-column label="置信度" width="120">
            <template #default="scope">
              {{ scope.row.confidence.toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column label="坐标">
            <template #default="scope">
              [{{ scope.row.x1.toFixed(1) }}, {{ scope.row.y1.toFixed(1) }}] -
              [{{ scope.row.x2.toFixed(1) }}, {{ scope.row.y2.toFixed(1) }}]
            </template>
          </el-table-column>
          <el-table-column label="Polygon 点数" width="140">
            <template #default="scope">
              {{ scope.row.polygon?.length ?? 0 }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <section class="panel-grid">
      <el-card class="panel-card wide-card">
        <template #header>
          <div class="panel-header">
            <span>PPOCR 调试</span>
            <el-tag size="small">debug-ppocr</el-tag>
          </div>
        </template>

        <div class="controls-grid">
          <el-form label-position="top" class="control-form">
            <el-form-item label="检测阈值">
              <el-input-number
                v-model="ppocrForm.detThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :precision="2"
              />
            </el-form-item>
            <el-form-item label="限制边长">
              <el-input-number
                v-model="ppocrForm.limitSideLen"
                :min="32"
                :max="4096"
                :step="32"
              />
            </el-form-item>
            <el-form-item label="性能迭代次数">
              <el-input-number
                v-model="ppocrForm.iterations"
                :min="1"
                :max="500"
                :step="1"
              />
            </el-form-item>
          </el-form>

          <div class="actions-column">
            <el-button
              type="primary"
              size="large"
              :loading="ppocrLoading"
              @click="runPPOcrTest"
              >运行 PPOCR</el-button
            >
            <el-button @click="fillPolygonFromYolo"
              >使用首个电池 Polygon</el-button
            >
            <el-button @click="clearPolygonText">清空 Polygon</el-button>
            <div class="metric-row">
              <el-statistic
                title="总耗时(ms)"
                :value="ppocrResult?.elapsedMs ?? 0"
                :precision="2"
              />
              <el-statistic
                title="平均耗时(ms)"
                :value="ppocrResult?.averageMs ?? 0"
                :precision="2"
              />
              <el-statistic
                title="文本框数量"
                :value="ppocrResult?.lines.length ?? 0"
              />
            </div>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="Polygon(JSON，可选)">
            <el-input
              v-model="ppocrPolygonText"
              type="textarea"
              :rows="4"
              placeholder="例如：[[0,0],[100,0],[100,40],[0,40]]"
            />
          </el-form-item>
        </el-form>

        <el-alert
          v-if="hasPolygonInput"
          title="当前使用 Polygon 裁切图像。下方框选坐标基于裁切后的调试画布，不再与原图一一对应。"
          type="warning"
          :closable="false"
          show-icon
        />

        <div class="result-text">
          <strong>识别结果：</strong>
          <span>{{ ppocrResult?.text || '暂无结果' }}</span>
        </div>

        <div class="canvas-shell" v-if="imagePreviewUrl || ppocrResult">
          <canvas ref="ppocrCanvasRef" class="result-canvas"></canvas>
        </div>

        <el-table
          v-if="ppocrResult?.lines.length"
          :data="ppocrResult.lines"
          stripe
        >
          <el-table-column prop="text" label="文本" min-width="180" />
          <el-table-column label="置信度" width="120">
            <template #default="scope">
              {{ scope.row.confidence.toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column label="坐标">
            <template #default="scope">
              [{{ scope.row.x }}, {{ scope.row.y }}] {{ scope.row.width }} x
              {{ scope.row.height }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles } from 'element-plus'

interface GoodsInfoResult {
  projectNo: string
  itemCName: string
  labels: string[]
  packageImage?: number[]
  segmentResults: Array<Record<string, unknown>>
}

interface SummaryInfoResult {
  [key: string]: unknown
}

interface YoloSegmentResult {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  confidence: number
  polygon?: number[][]
}

interface YoloDebugResult {
  elapsedMs: number
  iterations: number
  averageMs: number
  labels: string[]
  segmentResults: YoloSegmentResult[]
}

interface PPOcrDebugLine {
  x: number
  y: number
  width: number
  height: number
  text: string
  confidence: number
}

interface PPOcrDebugImage {
  width: number
  height: number
  data: number[]
}

interface PPOcrDebugResult {
  text: string
  imageWidth: number
  imageHeight: number
  detectWidth: number
  detectHeight: number
  lines: PPOcrDebugLine[]
  preparedImage?: PPOcrDebugImage | null
  elapsedMs: number
  iterations: number
  averageMs: number
}

const LABEL_RGB_MAP: Record<string, [number, number, number]> = {
  '9': [255, 0, 0],
  '9A': [0, 0, 255],
  bty: [0, 255, 0],
  UN3090: [0, 255, 0],
  UN3091: [0, 255, 0],
  UN3480: [0, 255, 0],
  UN3481: [0, 255, 0],
  UN3551: [0, 255, 0],
  UN3552: [0, 255, 0],
  CAO: [0, 0, 0],
}

const goodsIs965 = ref(false)
const goodsLoading = ref(false)
const goodsFileName = ref('')
const goodsBytes = ref<number[] | null>(null)
const goodsResult = ref<GoodsInfoResult | null>(null)

const summaryLoading = ref(false)
const summaryFileName = ref('')
const summaryBytes = ref<number[] | null>(null)
const summaryResult = ref<SummaryInfoResult | null>(null)

const imageFileName = ref('')
const imageBytes = ref<number[] | null>(null)
const imagePreviewUrl = ref('')
const yoloCanvasRef = ref<HTMLCanvasElement | null>(null)
const ppocrCanvasRef = ref<HTMLCanvasElement | null>(null)
let currentImageUrl: string | null = null

const yoloLoading = ref(false)
const yoloResult = ref<YoloDebugResult | null>(null)
const yoloForm = reactive({
  confidenceThreshold: 0.25,
  iterations: 1,
})

const ppocrLoading = ref(false)
const ppocrResult = ref<PPOcrDebugResult | null>(null)
const ppocrPolygonText = ref('')
const ppocrForm = reactive({
  detThreshold: 0.28,
  limitSideLen: 960,
  iterations: 1,
})

const goodsResultText = computed(
  () =>
    JSON.stringify(
      {
        projectNo: goodsResult.value?.projectNo,
        itemCName: goodsResult.value?.itemCName,
        labels: goodsResult.value?.labels,
        segmentResults: goodsResult.value?.segmentResults?.map((item) => ({
          label: item.label,
          confidence: item.confidence,
          x1: item.x1,
          y1: item.y1,
          x2: item.x2,
          y2: item.y2,
        })),
      },
      null,
      2
    ) || '暂无结果'
)
const summaryResultText = computed(
  () => JSON.stringify(summaryResult.value, null, 2) || '暂无结果'
)
const hasPolygonInput = computed(() => Boolean(ppocrPolygonText.value.trim()))

onBeforeUnmount(() => {
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl)
  }
})

function ensureBytes(
  bytes: number[] | null,
  message: string
): bytes is number[] {
  if (!bytes?.length) {
    ElMessage.error(message)
    return false
  }
  return true
}

function clampCanvasWidth(
  width: number,
  height: number,
  maxWidth: number = 1280
) {
  if (width <= maxWidth) {
    return { width, height }
  }
  const scale = maxWidth / width
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function getLabelColor(label: string): string {
  const rgb = LABEL_RGB_MAP[label] ?? [255, 196, 0]
  return `rgb(${rgb.join(',')})`
}

async function readFileBytes(file: File): Promise<number[]> {
  return Array.from(new Uint8Array(await file.arrayBuffer()))
}

async function handleGoodsFileChange(
  uploadFile: UploadFile,
  _files: UploadFiles
) {
  if (!uploadFile.raw) return
  goodsFileName.value = uploadFile.name
  goodsBytes.value = await readFileBytes(uploadFile.raw)
  goodsResult.value = null
}

async function handleSummaryFileChange(
  uploadFile: UploadFile,
  _files: UploadFiles
) {
  if (!uploadFile.raw) return
  summaryFileName.value = uploadFile.name
  summaryBytes.value = await readFileBytes(uploadFile.raw)
  summaryResult.value = null
}

async function handleImageFileChange(
  uploadFile: UploadFile,
  _files: UploadFiles
) {
  if (!uploadFile.raw) return
  imageFileName.value = uploadFile.name
  imageBytes.value = await readFileBytes(uploadFile.raw)
  yoloResult.value = null
  ppocrResult.value = null

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl)
  }
  currentImageUrl = URL.createObjectURL(uploadFile.raw)
  imagePreviewUrl.value = currentImageUrl
}

async function runGoodsTest() {
  if (!ensureBytes(goodsBytes.value, '请先选择图片 PDF 文件')) return
  goodsLoading.value = true
  try {
    goodsResult.value = await chrome.runtime.sendMessage({
      action: 'get-goods-info',
      pdfBytes: goodsBytes.value,
      is_965: goodsIs965.value,
    })
    console.log('Goods Info Result:', goodsResult.value)
    usePackageImage()
    await runYoloTest()
    fillPolygonFromYolo()
    runPPOcrTest()
  } catch (error) {
    console.error(error)
    ElMessage.error('图片 PDF 解析失败')
  } finally {
    goodsLoading.value = false
  }
}

async function runSummaryTest() {
  if (!ensureBytes(summaryBytes.value, '请先选择概要文件')) return
  summaryLoading.value = true
  try {
    summaryResult.value = await chrome.runtime.sendMessage({
      action: 'get-summary-info',
      summaryBytes: summaryBytes.value,
    })
    console.log('Summary Info Result:', summaryResult.value)
  } catch (error) {
    console.error(error)
    ElMessage.error('概要解析失败')
  } finally {
    summaryLoading.value = false
  }
}

async function runYoloTest() {
  if (!imageBytes.value) {
    ElMessage.error('请先选择测试图片')
    return
  }
  yoloLoading.value = true
  try {
    const result = (await chrome.runtime.sendMessage({
      action: 'debug-yolo',
      image: imageBytes.value,
      iterations: yoloForm.iterations,
      options: {
        confidenceThreshold: yoloForm.confidenceThreshold,
      },
    })) as YoloDebugResult
    yoloResult.value = result
    await renderYoloCanvas(result)
  } catch (error) {
    console.error(error)
    ElMessage.error('YOLO 调试失败')
  } finally {
    yoloLoading.value = false
  }
}

function parsePolygonText(): number[][] | undefined {
  const rawText = ppocrPolygonText.value.trim()
  if (!rawText) return undefined
  const parsed = JSON.parse(rawText)
  if (!Array.isArray(parsed)) {
    throw new Error('Polygon 必须是数组')
  }
  return parsed
}

async function runPPOcrTest() {
  if (!imageBytes.value) {
    ElMessage.error('请先选择测试图片')
    return
  }
  ppocrLoading.value = true
  try {
    const polygon = parsePolygonText()
    const result = (await chrome.runtime.sendMessage({
      action: 'debug-ppocr',
      image: imageBytes.value,
      polygon,
      iterations: ppocrForm.iterations,
      options: {
        detThreshold: ppocrForm.detThreshold,
        limitSideLen: ppocrForm.limitSideLen,
        includePreparedImage: true,
      },
    })) as PPOcrDebugResult
    ppocrResult.value = result
    await renderPPOcrCanvas(result, Boolean(polygon?.length))
  } catch (error) {
    console.error(error)
    ElMessage.error(error instanceof Error ? error.message : 'PPOCR 调试失败')
  } finally {
    ppocrLoading.value = false
  }
}

function usePackageImage() {
  if (!goodsResult.value?.packageImage?.length) {
    ElMessage.warning('当前 Goods Info 结果里没有 packageImage')
    return
  }
  const bytes = new Uint8Array(goodsResult.value.packageImage)
  imageBytes.value = Array.from(bytes)
  const blob = new Blob([bytes], { type: 'image/png' })
  const url = URL.createObjectURL(blob)
  imagePreviewUrl.value = url
}

function clearYoloResults() {
  yoloResult.value = null
  const canvas = yoloCanvasRef.value
  const context = canvas?.getContext('2d')
  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function clearPolygonText() {
  ppocrPolygonText.value = ''
}

function fillPolygonFromYolo() {
  const polygon = yoloResult.value?.segmentResults.find(
    (item) => item.label === 'bty' || item.label.startsWith('UN')
  )?.polygon
  if (!polygon?.length) {
    ElMessage.warning('当前 YOLO 结果里没有可用的电池 Polygon')
    return
  }
  ppocrPolygonText.value = JSON.stringify(polygon)
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

async function renderYoloCanvas(result: YoloDebugResult) {
  if (!imagePreviewUrl.value || !yoloCanvasRef.value) {
    return
  }
  const img = await loadImageElement(imagePreviewUrl.value)
  const canvas = yoloCanvasRef.value
  const size = clampCanvasWidth(img.width, img.height)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) return

  const scaleX = size.width / img.width
  const scaleY = size.height / img.height
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(img, 0, 0, size.width, size.height)

  for (const item of result.segmentResults) {
    const color = getLabelColor(item.label)
    const x = item.x1 * scaleX
    const y = item.y1 * scaleY
    const width = (item.x2 - item.x1) * scaleX
    const height = (item.y2 - item.y1) * scaleY
    context.strokeStyle = color
    context.lineWidth = 3
    context.strokeRect(x, y, width, height)

    const labelText = `${item.label} ${(item.confidence * 100).toFixed(1)}%`
    context.font = '16px Arial'
    const textWidth = context.measureText(labelText).width
    context.fillStyle = color
    context.fillRect(x, Math.max(0, y - 24), textWidth + 12, 24)
    context.fillStyle = '#ffffff'
    context.fillText(labelText, x + 6, Math.max(16, y - 7))

    if (item.polygon?.length) {
      context.beginPath()
      item.polygon.forEach(([pointX, pointY], index) => {
        const scaledX = pointX * scaleX
        const scaledY = pointY * scaleY
        if (index === 0) {
          context.moveTo(scaledX, scaledY)
        } else {
          context.lineTo(scaledX, scaledY)
        }
      })
      context.closePath()
      context.stroke()
    }
  }
}

async function renderPPOcrCanvas(
  result: PPOcrDebugResult,
  hasPolygon: boolean
) {
  const canvas = ppocrCanvasRef.value
  if (!canvas) {
    return
  }

  const preparedImage = result.preparedImage
  const baseWidth = Math.max(
    1,
    preparedImage?.width || result.detectWidth || result.imageWidth || 1
  )
  const baseHeight = Math.max(
    1,
    preparedImage?.height || result.detectHeight || result.imageHeight || 1
  )
  const size = clampCanvasWidth(baseWidth, baseHeight, 960)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, canvas.width, canvas.height)
  if (preparedImage) {
    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = preparedImage.width
    sourceCanvas.height = preparedImage.height
    const sourceContext = sourceCanvas.getContext('2d')
    if (sourceContext) {
      sourceContext.putImageData(
        new ImageData(
          new Uint8ClampedArray(preparedImage.data),
          preparedImage.width,
          preparedImage.height
        ),
        0,
        0
      )
      context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
    }
  } else if (!hasPolygon && imagePreviewUrl.value) {
    const img = await loadImageElement(imagePreviewUrl.value)
    context.drawImage(img, 0, 0, canvas.width, canvas.height)
  } else {
    context.fillStyle = '#111820'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#8ca6c1'
    context.font = '16px Arial'
    context.fillText('当前为 Polygon 裁切调试视图。', 16, 28)
  }

  const scaleX = canvas.width / baseWidth
  const scaleY = canvas.height / baseHeight

  for (const line of result.lines) {
    const x = line.x * scaleX
    const y = line.y * scaleY
    const width = line.width * scaleX
    const height = line.height * scaleY
    context.strokeStyle = '#4dd0a8'
    context.lineWidth = 2
    context.strokeRect(x, y, width, height)
    context.fillStyle = 'rgba(77, 208, 168, 0.18)'
    context.fillRect(x, y, width, height)

    const labelText = `${line.text || '<empty>'} ${(line.confidence * 100).toFixed(1)}%`
    context.font = '14px Arial'
    const textWidth = context.measureText(labelText).width
    context.fillStyle = '#13241e'
    context.fillRect(x, Math.max(0, y - 22), textWidth + 12, 22)
    context.fillStyle = '#ffffff'
    context.fillText(labelText, x + 6, Math.max(15, y - 7))
  }
}
</script>

<style scoped>
.debug-page {
  display: grid;
  gap: 24px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 28px;
  border: 1px solid rgba(120, 140, 160, 0.3);
  border-radius: 20px;
  background:
    radial-gradient(
      circle at top right,
      rgba(81, 159, 31, 0.22),
      transparent 30%
    ),
    linear-gradient(135deg, rgba(14, 24, 36, 0.92), rgba(25, 37, 52, 0.88));
}

.eyebrow {
  margin: 0 0 8px;
  color: #8db38e;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 12px;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.1;
}

.hero-copy {
  max-width: 720px;
  margin: 12px 0 0;
  color: #c3d0dc;
}

.panel-grid {
  display: grid;
  gap: 24px;
}

.two-column {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.panel-card {
  border-radius: 18px;
}

.wide-card :deep(.el-card__body) {
  display: grid;
  gap: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.dropzone {
  width: 100%;
}

.dropzone :deep(.el-upload-dragger) {
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(34, 48, 63, 0.8),
    rgba(16, 24, 34, 0.9)
  );
}

.upload-icon {
  font-size: 32px;
  color: #8db38e;
}

.upload-tip {
  color: #9fb2c6;
}

.inline-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.compact-gap {
  gap: 12px;
}

.controls-grid {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 20px;
}

.control-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.actions-column {
  display: grid;
  gap: 12px;
  align-content: start;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.canvas-shell {
  overflow: auto;
  border-radius: 18px;
  border: 1px solid rgba(120, 140, 160, 0.2);
  background: #0a1016;
  padding: 14px;
}

.result-canvas {
  width: 100%;
  height: auto;
  display: block;
}

.result-block {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  overflow: auto;
  background: #121922;
  color: #dfe8f0;
}

.result-text {
  display: flex;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
  color: #dfe8f0;
}

@media (max-width: 960px) {
  .hero-card {
    flex-direction: column;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }
}
</style>

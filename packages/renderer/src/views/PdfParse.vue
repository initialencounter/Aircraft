<script lang="ts" setup xmlns="">
import { computed, ref } from 'vue'
import summaryTable from '../components/SummaryTable.vue'
import FileDropzone from '../components/FileDropzone.vue'
import { useSummaryStore } from '../stores/summary'
import { useLogStore, type LogStore } from '../stores/logs'
import { useParseStore } from '../stores/parse'
import { Loading } from '@element-plus/icons-vue'
import type { SummaryFormJSONData } from '../../../wxt/share/types'

const summaryStore = useSummaryStore()
const parseStore = useParseStore()

const loading = computed(() => parseStore.loading)
const labelPosition = ref('result')

// 遮罩上的实时日志
const logStore: LogStore = useLogStore()
const MASK_LOG_COUNT = 30 // 遮罩上最多显示的日志条数
const maskLogs = computed(() => {
  return [...logStore.logHistory].reverse().slice(0, MASK_LOG_COUNT)
})

// 展示数据直接从 store 派生，解析/切视图都不会丢
const verifyResult = computed(() => summaryStore.result)
const parseResult = computed(() => summaryStore.docx)
const llmResult = computed(() => summaryStore.pdf)

document.oncontextmenu = function () {
  return false
}

const handleFilesChange = (_files: File[]) => {}

const handleFileSelect = (file: File) => {
  if (file.name.endsWith('.docx') || file.type.includes('word')) {
    parseStore.parseDocx(file)
  }
}

const handleFileRemove = (_file: File) => {}

const handleClipboardSummary = (data: SummaryFormJSONData) => {
  parseStore.setClipboardSummary(data)
}

const handleParsePdf = (file: File) => {
  parseStore.parsePdf(file)
}

const handleCompareReport = () => {
  parseStore.compareReport()
}

const closeMask = () => {
  parseStore.loading = false
}
</script>

<template>
  <!-- 添加一个相对定位的容器包裹整个组件内容 -->
  <div class="pdf-parse-container">
    <!-- 头部 -->
    <h1 class="noSelectTitle" style="font-size: 24px"></h1>
    <!-- 内容区 -->
    <FileDropzone
      accept=".pdf,.docx"
      :multiple="true"
      :maxSize="20"
      :maxFiles="5"
      @files-change="handleFilesChange"
      @file-select="handleFileSelect"
      @file-remove="handleFileRemove"
      @parse-pdf="handleParsePdf"
      @compare-report="handleCompareReport"
      @clipboard-summary="handleClipboardSummary"
    />
    <el-radio-group v-model="labelPosition">
      <el-radio value="result">验证结果</el-radio>
      <el-radio value="summary">概要</el-radio>
      <el-radio value="UN38.3">UN38.3报告</el-radio>
    </el-radio-group>
    <br />
    <k-markdown
      v-if="labelPosition === 'result'"
      :source="'- ' + verifyResult.join('\n- ')"
    ></k-markdown>
    <summaryTable
      v-if="labelPosition === 'summary'"
      :data="parseResult"
    ></summaryTable>
    <summaryTable
      v-if="labelPosition === 'UN38.3'"
      :data="llmResult"
      :isUN38="true"
    ></summaryTable>

    <!-- 添加遮罩层 - 现在相对于容器定位 -->
    <div class="loading-mask" v-if="loading" @dblclick="closeMask">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>正在解析文件，请稍候...<br />双击关闭遮罩</span>
      </div>
      <!-- 实时日志，30% 透明度 -->
      <div class="loading-log">
        <div
          v-for="(item, index) in maskLogs"
          :key="index"
          class="loading-log-item"
        >
          <span class="log-timestamp">[{{ item.timeStamp }}]</span>
          <span class="log-level">{{ item.level }}</span>
          <span class="log-message">{{ item.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-parse-container {
  position: relative; /* 设置为相对定位，作为遮罩的定位参考 */
  width: 100%;
  height: 100%;
}

.loading-mask {
  position: absolute; /* 改为绝对定位，相对于.pdf-parse-container */
  top: 0;
  left: 0;
  width: 100%;
  height: 180%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10; /* 降低z-index，只要能覆盖当前组件即可 */
}

.loading-content {
  padding: 20px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-on-dark); /* 遮罩为深色，文字保持白色 */
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 10px;
  animation: rotate 1.5s linear infinite;
}

.loading-log {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 60%;
  overflow-y: auto;
  opacity: 0.3; /* 30% 透明度 */
  padding: 10px 20px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--color-on-dark);
  display: flex;
  flex-direction: column; /* 最新日志在最上方 */
}

.loading-log-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  white-space: nowrap;
}

.log-timestamp {
  color: var(--color-text-muted);
}

.log-level {
  font-weight: bold;
}

.log-message {
  word-break: break-all;
  white-space: normal;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

<script lang="ts" setup xmlns="">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from 'vue'
import { ipcManager } from '../utils/ipcManager'
import summaryTable from '../components/SummaryTable.vue'
import type { SummaryFromLLM } from '@aircraft/validators'
import { ElMessage } from 'element-plus'
import FileDropzone from '../components/FileDropzone.vue'
import { checkSummaryFromLLM } from '@aircraft/validators'
import { convertSummaryInfo2SummaryFromLLM } from '@aircraft/validators/src/lithium/shared/utils'
import { useSummaryStore } from '../stores/summary'
import { SummaryInfo } from 'aircraft-rs'
import { Loading } from '@element-plus/icons-vue'
interface ParseReportFiles {
  pdf: File
  docx: File
}
const summaryStore = useSummaryStore()

const loading = ref(false)
const labelPosition = ref('summary')
const verifyResult = ref<string[]>(summaryStore.result)
const parseResult = ref<SummaryFromLLM>(summaryStore.pdf)
const llmResult = ref<SummaryFromLLM>(summaryStore.docx)
document.oncontextmenu = function () {
  return false
}

const handleFilesChange = (_files: File[]) => {}

const handleFileSelect = (_file: File) => {}

const handleFileRemove = (_file: File) => {}

const handleParseReport = async (files: ParseReportFiles) => {
  loading.value = true // 开始处理文件时显示loading
  try {
    const pdfDataUrl = await fileToBase64(files.pdf)
    const docxDataUrl = await fileToBase64(files.docx)
    if (!pdfDataUrl || !docxDataUrl) {
      ElMessage.error('文件解析失败')
      loading.value = false
      return
    }
    const pdfBase64 = pdfDataUrl.split(',')[1]
    const docxBase64 = docxDataUrl.split(',')[1]
    const pdfRes: SummaryFromLLM = JSON.parse(
      await ipcManager.invoke('get_report_summary_by_buffer', {
        base64String: pdfBase64,
      })
    )
    const docxRes: SummaryInfo = await ipcManager.invoke(
      'get_summary_info_by_buffer',
      { base64String: docxBase64 }
    )

    llmResult.value = pdfRes as SummaryFromLLM
    summaryStore.setPdf(llmResult.value)
    parseResult.value = convertSummaryInfo2SummaryFromLLM(docxRes)
    summaryStore.setDocx(parseResult.value)

    let result = checkSummaryFromLLM(pdfRes, docxRes)
    verifyResult.value = result.map((item) => item.result)
    summaryStore.setResult(verifyResult.value)
  } catch (e) {
    console.log(e)
    ElMessage.error('解析失败' + e)
  } finally {
    loading.value = false // 无论成功或失败都关闭loading
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const base64String = reader.result as string
      resolve(base64String)
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsDataURL(file)
  })
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
      @parse-report="handleParseReport"
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
    <div class="loading-mask" v-if="loading" @dblclick="loading = false">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>正在解析文件，请稍候...<br />双击关闭遮罩</span>
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
  color: white; /* 确保文字在深色背景上可见 */
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 10px;
  animation: rotate 1.5s linear infinite;
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

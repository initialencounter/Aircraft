<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'
import { formatFileSize, formatTimestamp, getFileIcon } from '../utils/utils'
import FileList from './FileList.vue'
import { FileItem } from '../types'
import { FileItemStore } from '../stores/fileItem.ts'

const props = defineProps({
  accept: {
    type: String,
    default: '*',
  },
  multiple: {
    type: Boolean,
    default: true,
  },
  maxSize: {
    type: Number,
    default: 10, // MB
  },
  maxFiles: {
    type: Number,
    default: 10,
  },
})

const emit = defineEmits([
  'files-change',
  'file-select',
  'file-remove',
  'parse-report',
  'clipboard-summary',
])

interface ParseReportFiles {
  pdf?: File
  docx?: File
}
const name = 'summary'
const fileItemStore = FileItemStore()
const files = ref<FileItem[]>(fileItemStore[name] ?? [])
const dropzoneRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

let colorList = [
  '#3cb44b',
  '#ffe119',
  '#4363d8',
  '#f58231',
  '#42d4f4',
  '#f032e6',
  '#fabed4',
  '#469990',
  '#dcbeff',
  '#9A6324',
  '#fffac8',
  '#800000',
  '#aaffc3',
  '#000075',
  '#a9a9a9',
  '#ffffff',
  '#e6194B',
  '#000000',
]
let colorIndex = 0

watch(files, (newVal: FileItem[]) => {
  fileItemStore[name] = newVal
})

// 处理拖拽进入事件
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

// 处理拖拽离开事件
const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
}

// 处理拖拽悬停事件
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

// 处理文件拖放事件
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  if (!e.dataTransfer?.files) return

  const droppedFiles = Array.from(e.dataTransfer.files)
  processFiles(droppedFiles)
}

// 处理文件输入变更
const handleFileInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files) return

  const selectedFiles = Array.from(target.files)
  processFiles(selectedFiles)

  // 重置input以允许重新选择相同文件
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// 处理手动选择文件
const handleSelectFiles = () => {
  fileInputRef.value?.click()
}

// 处理读取剪贴板概要
const handleReadClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    const data = JSON.parse(text)
    if (data && data.projectNo) {
      emit('clipboard-summary', data)
      ElMessage.success('成功读取剪贴板概要数据')
    } else {
      ElMessage.warning('剪贴板中没有找到期望的概要数据')
    }
  } catch (e) {
    ElMessage.error('剪贴板中没有合法的JSON格式概要数据')
  }
}

// 处理清空所有文件
const handleClearFiles = () => {
  files.value = []
  colorIndex = 0
  emit('files-change', [])
  ElMessage.success('已清空所有文件')
}

// 处理文件任务
const handleParseReport = () => {
  if (files.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }
  if (files.value.length > 2) {
    ElMessage.warning('只能选择两个文件进行比较')
    return
  }
  const parseReportFiles: ParseReportFiles = {
    pdf: undefined,
    docx: undefined,
  }
  for (const file of files.value) {
    if (file.file.type === 'application/pdf') {
      parseReportFiles.pdf = file.file
    } else {
      parseReportFiles.docx = file.file
    }
  }
  emit('parse-report', parseReportFiles)
}

// 处理文件处理逻辑
const processFiles = (newFiles: File[]) => {
  // 处理文件
  newFiles.forEach((file) => {

    // 检查文件大小
    if (file.size > props.maxSize * 1024 * 1024) {
      ElMessage.warning(`文件过大: ${file.name}`)
      return
    }

    getMd5(file, files.value.length)

    // 创建文件项
    const fileItem: FileItem = {
      file,
      size: formatFileSize(file.size),
      lastModified: formatTimestamp(file.lastModified),
      type: file.type || '未知类型',
      icon: getFileIcon(file.type),
      additionValue: 'loading...',
      bgColor: '#000',
    }

    files.value.push(fileItem)
    emit('file-select', file)
  })

  // 添加有效文件
  emit(
    'files-change',
    files.value.map((item) => item.file)
  )

  if (files.value.length > 0) {
    ElMessage.success(`已添加 ${files.value.length} 个文件`)
  }
}

function getMd5(blob: Blob, id: number) {
  const reader = new FileReader()
  reader.onloadend = () => {
    const spark = new SparkMD5.ArrayBuffer()
    spark.append(reader.result as ArrayBuffer)
    const res = spark.end()
    console.log('MD5:', res, '文件ID:', id)
    if (files.value[id]) {
      files.value[id]['additionValue'] = res
    }
    for (let i = 0; i < files.value.length; i++) {
      let value = files.value[i]
      if (value.additionValue === res) {
        files.value[id]['bgColor'] = value.bgColor
        break
      }
    }
    if (files.value[id]['bgColor'] === '#000') {
      files.value[id]['bgColor'] = colorList[colorIndex]
      colorIndex++
      if (colorIndex >= colorList.length) {
        ElMessage.warning({
          message: '颜色已经用完了，请清空列表！！回收颜色！！',
          type: 'warning',
        })
      }
    }
  }
  reader.onerror = () => {
    if (files.value) {
      files.value[id]['additionValue'] = 'Error!'
    }
  }
  reader.readAsArrayBuffer(blob)
}

// 设置事件监听
onMounted(() => {
  const dropzone = dropzoneRef.value
  if (dropzone) {
    dropzone.addEventListener('dragenter', handleDragEnter)
    dropzone.addEventListener('dragleave', handleDragLeave)
    dropzone.addEventListener('dragover', handleDragOver)
    dropzone.addEventListener('drop', handleDrop)
  }
})

// 移除事件监听
onBeforeUnmount(() => {
  const dropzone = dropzoneRef.value
  if (dropzone) {
    dropzone.removeEventListener('dragenter', handleDragEnter)
    dropzone.removeEventListener('dragleave', handleDragLeave)
    dropzone.removeEventListener('dragover', handleDragOver)
    dropzone.removeEventListener('drop', handleDrop)
  }
})
</script>

<template>
  <div class="file-dropzone-container">
    <!-- 文件输入框（隐藏） -->
    <input
      ref="fileInputRef"
      :accept="accept"
      :multiple="multiple"
      class="file-input"
      type="file"
      @change="handleFileInputChange"
    />

    <!-- 拖拽区 -->
    <div
      ref="dropzoneRef"
      :class="{ 'is-dragging': isDragging }"
      class="file-dropzone"
    >
      <!-- 文件列表 -->
      <div v-if="files.length > -1" class="file-list">
        <div class="file-list-header">
          <span>已添加 {{ files.length }} 个文件</span>
          <el-button size="small" type="primary" @click="handleReadClipboard"
            >从剪贴板读取概要
          </el-button>
          <el-button size="small" type="danger" @click="handleSelectFiles"
            >手动选择文件
          </el-button>
          <el-button size="small" type="danger" @click="handleParseReport"
            >比较UN报告与概要
          </el-button>
          <el-button size="small" type="danger" @click="handleClearFiles"
            >清空所有文件
          </el-button>
        </div>
        <FileList
          v-model="files"
          addition-label="MD5"
          empty-text="请拖拽UN报告和概要到此处"
        ></FileList>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-dropzone-container {
  width: 100%;
  margin-bottom: 20px;
}

.file-input {
  display: none;
}

.file-dropzone {
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  background-color: var(--color-background-elevated);
  transition: all 0.3s;
  cursor: pointer;
}

.file-dropzone:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}

.is-dragging {
  border-color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

.file-list {
  margin-top: 20px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--color-background-elevated);
  border-bottom: 1px solid var(--color-border);
}

:deep(.el-table th) {
  background-color: var(--color-background-elevated);
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: var(--color-background-elevated);
}
</style>

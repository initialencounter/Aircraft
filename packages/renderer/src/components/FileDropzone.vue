<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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

// 处理清空所有文件
const handleClearFiles = () => {
  files.value = []
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
  if (files.value.length < 2) {
    if (files.value[0].file.type === 'application/pdf') {
      ElMessage.warning('缺少概要(docx)文件')
    } else {
      ElMessage.warning('缺少UN报告(pdf)文件')
    }
    return
  }
  if (files.value[0].file.type === files.value[1].file.type) {
    ElMessage.warning('请分别选择UN报告(pdf)和概要(docx)文件')
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
  // 检查文件数量限制
  if (files.value.length + newFiles.length > props.maxFiles) {
    ElMessage.warning(`最多只能上传${props.maxFiles}个文件`)
    newFiles = newFiles.slice(0, props.maxFiles - files.value.length)
  }

  // 处理文件
  const validFiles: FileItem[] = []
  newFiles.forEach((file) => {
    // 检查文件类型
    if (props.accept !== '*' && !isAcceptedFile(file)) {
      ElMessage.warning(`不支持的文件类型: ${file.name}`)
      return
    }

    // 检查文件大小
    if (file.size > props.maxSize * 1024 * 1024) {
      ElMessage.warning(`文件过大: ${file.name}`)
      return
    }

    // 创建文件项
    const fileItem: FileItem = {
      file,
      size: formatFileSize(file.size),
      lastModified: formatTimestamp(file.lastModified),
      type: file.type || '未知类型',
      icon: getFileIcon(file.type),
    }

    validFiles.push(fileItem)
    emit('file-select', file)
  })

  // 添加有效文件
  files.value = [...files.value, ...validFiles]
  emit(
    'files-change',
    files.value.map((item) => item.file)
  )

  if (validFiles.length > 0) {
    ElMessage.success(`已添加 ${validFiles.length} 个文件`)
  }
}

// 检查文件是否为接受类型
const isAcceptedFile = (file: File): boolean => {
  const acceptTypes = props.accept.split(',').map((type) => type.trim())

  for (const type of acceptTypes) {
    // 处理 .jpg, .pdf 这种格式
    if (type.startsWith('.')) {
      if (file.name.toLowerCase().endsWith(type.toLowerCase())) return true
    }
    // 处理 image/* 这种格式
    else if (type.endsWith('/*')) {
      const category = type.slice(0, -2)
      if (file.type.startsWith(`${category}/`)) return true
    }
    // 处理具体的MIME类型
    else if (file.type === type) {
      return true
    }
  }

  return false
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
  border: 2px dashed #606266;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.03);
  transition: all 0.3s;
  cursor: pointer;
}

.file-dropzone:hover {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.is-dragging {
  border-color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

.file-list {
  margin-top: 20px;
  border: 1px solid #484848;
  border-radius: 4px;
  overflow: hidden;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #363636;
  border-bottom: 1px solid #484848;
}

:deep(.el-table th) {
  background-color: #363636;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: #363636;
}
</style>

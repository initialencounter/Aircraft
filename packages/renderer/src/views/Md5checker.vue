<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import {onBeforeUnmount, onMounted, ref, watch} from 'vue'
import SparkMD5 from 'spark-md5'
import { ElMessage } from 'element-plus'
import FileList from '../components/FileList.vue'
import { FileItem } from '../types'
import { formatFileSize, formatTimestamp, getFileIcon } from '../utils/utils.ts'
import {FileItemStore} from "../stores/fileItem.ts";

// forked from https://www.zhihu.com/question/26744174/answer/2468892079
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

const name = 'md5'
const fileItemStore = FileItemStore()
const file_list = ref<FileItem[]>(fileItemStore[name] ?? [])
const dropzoneRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

watch(file_list, (newVal: FileItem[]) => {
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

// 处理文件处理逻辑
const processFiles = (newFiles: File[]) => {
  // 处理文件
  for (let file_id = 0; file_id < newFiles.length; file_id++) {
    // 创建文件项
    const file = newFiles[file_id]
    getMd5(file, file_list.value.length)
    const fileItem: FileItem = {
      file,
      size: formatFileSize(file.size),
      lastModified: formatTimestamp(file.lastModified),
      type: file.type || '未知类型',
      icon: getFileIcon(file.type),
      additionValue: 'loading...',
      bgColor: '#000',
    }

    file_list.value.push(fileItem)
  }
  fileItemStore[name] = file_list
}

// 处理手动选择文件
const handleSelectFiles = () => {
  fileInputRef.value?.click()
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

function handleClearFiles() {
  file_list.value = []
  colorIndex = 0
}

function getMd5(blob: Blob, id: number) {
  const reader = new FileReader()
  reader.onloadend = () => {
    const spark = new SparkMD5.ArrayBuffer()
    spark.append(reader.result as ArrayBuffer)
    const res = spark.end()
    if (file_list.value[id]) {
      file_list.value[id]['additionValue'] = res
    }
    for (let i = 0; i < file_list.value.length; i++) {
      let value = file_list.value[i]
      if (value.additionValue === res) {
        file_list.value[id]['bgColor'] = value.bgColor
        break
      }
    }
    if (file_list.value[id]['bgColor'] === '#000') {
      file_list.value[id]['bgColor'] = colorList[colorIndex]
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
    if (file_list.value) {
      file_list.value[id]['additionValue'] = 'Error!'
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
  <!-- 文件输入框（隐藏） -->
  <input
    ref="fileInputRef"
    :multiple="true"
    accept="*"
    class="file-input"
    type="file"
    @change="handleFileInputChange"
  />
  <div
    ref="dropzoneRef"
    :class="{ 'is-dragging': isDragging }"
    class="file-dropzone"
  >
    <!-- 内容区 -->
    <div class="file-list">
      <div class="file-list-header">
        <span>文件一致性校对器</span>
        <el-button size="small" type="danger" @click="handleSelectFiles"
          >手动选择文件
        </el-button>
        <el-button size="small" type="danger" @click="handleClearFiles"
          >清空所有文件
        </el-button>
      </div>
      <FileList
        v-model="file_list"
        addition-label="MD5"
        empty-text="请拖拽文件到此处，颜色相同则文件一致！"
      ></FileList>
    </div>
  </div>
</template>

<style scoped>
.file-input {
  display: none;
}

.file-dropzone {
  border: 2px dashed #606266;
  width: 100%;
  height: 100%;
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

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, UploadFilled } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    modelValue: File | null
    label: string
    accept?: string
    disabled?: boolean
  }>(),
  {
    accept: '.pdf',
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', file: File | null): void
  (e: 'file-selected', file: File): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
let dragCounter = 0

function openPicker() {
  if (props.disabled) return
  fileInputRef.value?.click()
}

function isAccepted(file: File) {
  const accept = props.accept.trim()
  if (!accept || accept === '*') return true
  const fileName = file.name.toLowerCase()
  return accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((extension) => {
      if (extension.startsWith('.')) return fileName.endsWith(extension)
      if (extension.includes('/')) return file.type === extension
      return fileName.endsWith(`.${extension}`)
    })
}

function selectFile(file: File | undefined) {
  if (!file) return
  if (!isAccepted(file)) {
    ElMessage.warning(`仅支持 ${props.accept} 文件`)
    return
  }
  emit('update:modelValue', file)
  emit('file-selected', file)
}

function handleFileInputClick(event: MouseEvent) {
  // 隐藏的 input 在拖拽区内部，阻止它的 click 冒泡到外层，避免重复打开文件选择框
  event.stopPropagation()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  selectFile(target.files?.[0])
  target.value = ''
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (props.disabled) return
  dragCounter++
  isDragging.value = true
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragging.value = false
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  dragCounter = 0
  isDragging.value = false
  if (props.disabled) return
  const files = event.dataTransfer?.files
  if (files && files.length > 1) {
    ElMessage.warning('每个拖拽框只能放一个文件，已使用第一个')
  }
  selectFile(files?.[0])
}

function clearFile() {
  if (props.disabled) return
  emit('update:modelValue', null)
}
</script>

<template>
  <div
    class="single-dropzone"
    :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }"
    @click="openPicker"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <input
      ref="fileInputRef"
      :accept="accept"
      class="file-input"
      type="file"
      @change="handleFileInputChange"
      @click="handleFileInputClick"
    />

    <template v-if="modelValue">
      <el-icon class="file-icon"><Document /></el-icon>
      <div class="file-name" :title="modelValue.name">
        {{ modelValue.name }}
      </div>
      <el-button
        :disabled="disabled"
        size="small"
        text
        type="danger"
        @click.stop="clearFile"
      >
        移除
      </el-button>
    </template>
    <template v-else>
      <el-icon class="upload-icon"><UploadFilled /></el-icon>
      <div class="drop-title">{{ label }}</div>
      <div class="drop-hint">拖入 PDF，或点击选择</div>
    </template>
  </div>
</template>

<style scoped>
.single-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  padding: 24px;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-background-elevated);
  cursor: pointer;
  text-align: center;
  transition: all 0.3s;
}

.single-dropzone:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.single-dropzone.is-dragging {
  border-color: var(--color-success);
  background: rgba(103, 194, 58, 0.1);
}

.single-dropzone.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.file-input {
  display: none;
}

.upload-icon {
  font-size: 40px;
  color: var(--color-text-muted);
}

.file-icon {
  font-size: 36px;
  color: var(--color-primary);
}

.drop-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-strong);
}

.drop-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.file-name {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

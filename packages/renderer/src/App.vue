<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import type { Event } from '@tauri-apps/api/event'
import SideBar from './components/SideBar.vue'
import { ipcManager } from './utils/ipcManager.ts'
import router from './router'
import { pendingDropFiles } from './utils/globalDrop'

interface Link {
  link: string
}

ipcManager.on('open_link', (data: Event<Link>): void => {
  window.open(data.payload.link)
})

// 全局文件拖拽：任何页面都可拖拽文件，其他路由检测到文件拖入时跳转到 /summary_parse
const handleGlobalDragEnter = (e: DragEvent) => {
  const types = e.dataTransfer?.types
  if (types && Array.from(types).includes('Files')) {
    e.preventDefault()
    if (router.currentRoute.value.path !== '/summary_parse') {
      router.push('/summary_parse')
    }
  }
}

// 允许在窗口任意位置放下文件
const handleGlobalDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleGlobalDrop = (e: DragEvent) => {
  e.preventDefault()
  const droppedFiles = Array.from(e.dataTransfer?.files ?? [])
  if (droppedFiles.length > 0) {
    pendingDropFiles.value = droppedFiles
    if (router.currentRoute.value.path !== '/summary_parse') {
      router.push('/summary_parse')
    }
  }
}

onMounted(() => {
  window.addEventListener('dragenter', handleGlobalDragEnter)
  window.addEventListener('dragover', handleGlobalDragOver)
  window.addEventListener('drop', handleGlobalDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', handleGlobalDragEnter)
  window.removeEventListener('dragover', handleGlobalDragOver)
  window.removeEventListener('drop', handleGlobalDrop)
})
</script>

<template>
  <div class="main-container" data-tauri-drag-region>
    <div id="drag-area" class="drag-area draggable"></div>
    <TitleBar
      avatar="https://avatars.githubusercontent.com/u/109729945"
      link="https://github.com/initialencounter/aircraft"
    ></TitleBar>
    <SideBar />
    <div class="content">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
@import url('./assets/css/app.css');

.drag-area {
  position: fixed; /* 固定定位，相对于视口 */
  left: 125px;
  top: 0;
  width: calc(100vw - 285px); /* 减去左侧边栏宽度和右侧按钮区域宽度 */
  height: 56px;
  background-color: rgba(222, 134, 50, 0); /* 透明背景 */
  z-index: 5;
  pointer-events: auto; /* 确保可以接收拖拽事件 */
}

.main-container {
  display: flex;
  min-height: calc(100vh - 60px); /* 减去标题栏高度 */
  height: 100%;
  flex: 1;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  margin-top: 2.2rem;
  margin-left: 8rem; /* 添加左边距，与侧边栏宽度相同 */
  position: relative;
  z-index: 1;
}
</style>

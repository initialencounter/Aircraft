<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// 导入需要使用的图标组件
import { House, Setting, Document } from '@element-plus/icons-vue'

const router = useRouter()
const activeIndex = ref('1')

const menuItems = [
  { index: '1', path: '/', label: '首页', icon: House },
  { index: '2', path: '/schema', label: '服务设置', icon: Setting },
  { index: '3', path: '/schema_base', label: '基础设置', icon: Setting },
  { index: '4', path: '/logs', label: '日志', icon: Document },
]

const handleSelect = (index: string) => {
  const item = menuItems.find(item => item.index === index)
  if (item) {
    router.push(item.path)
  }
}
</script>

<template>
  <el-menu
    :default-active="activeIndex"
    class="sidebar-menu"
    @select="handleSelect">
    <el-menu-item class="sidebar-menu-item" v-for="item in menuItems" 
                  :key="item.index" 
                  :index="item.index">
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </el-menu-item>
  </el-menu>
</template>

<style scoped>
.sidebar-menu {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background-color: #252529;
  z-index: 1;
}


.sidebar-menu-item {
  background-color: #252529;
}
.sidebar-menu-item:hover {
  background-color: #4f9633;
}
</style> 
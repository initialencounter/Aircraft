<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Box,
  Document,
  House,
  MoonNight,
  Notebook,
  Search,
  Setting,
} from '@element-plus/icons-vue'
import Clip from '../assets/svg/Clip.vue'

const router = useRouter()
const activeIndex = ref('1')

const menuItems = [
  {
    index: '1',
    path: '/home',
    label: '首页',
    icon: House,
  },
  {
    index: '2',
    path: '/schema',
    label: '设置',
    icon: Setting,
  },
  {
    index: '3',
    path: '/stack',
    label: '堆码计算',
    icon: Box,
  },
  {
    index: '4',
    path: '/md5',
    label: 'MD5',
    icon: Clip,
  },
  {
    index: '5',
    path: '/summary_parse',
    label: '概要解析',
    icon: MoonNight,
  },
  {
    index: '6',
    path: '/logs',
    label: '日志',
    icon: Document,
  },
  {
    index: '7',
    path: '/searchTNotes',
    label: '技术部备注',
    icon: Search,
  },
  {
    index: '8',
    path: '/clipkeeper',
    label: '剪贴板快照',
    icon: Notebook,
  },
]

const handleSelect = (index: string) => {
  const item = menuItems.find((item) => item.index === index)
  if (item) {
    router.push(item.path)
  }
}
</script>

<template>
  <el-menu
    :default-active="activeIndex"
    class="sidebar-menu"
    @select="handleSelect"
  >
    <el-menu-item
      class="sidebar-menu-item"
      v-for="item in menuItems"
      :key="item.index"
      :index="item.index"
    >
      <el-icon>
        <component :is="item.icon" />
      </el-icon>
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
  z-index: 10;
}

.sidebar-menu-item {
  background-color: #252529;
}

.sidebar-menu-item:hover {
  background-color: #4f9633;
}

* {
  user-select: none;
  -webkit-user-select: none;
}
</style>

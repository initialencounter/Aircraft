<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  Box,
  Document,
  House,
  MoonNight,
  Notebook,
  Search,
  Setting,
} from '@element-plus/icons-vue'

const route = useRoute()

const menuItems = [
  {
    path: '/home',
    label: '首页',
    icon: House,
  },
  {
    path: '/schema',
    label: '设置',
    icon: Setting,
  },
  {
    path: '/stack',
    label: '堆码计算',
    icon: Box,
  },
  {
    path: '/logs',
    label: '日志',
    icon: Document,
  },
  {
    path: '/summary_parse',
    label: '概要解析',
    icon: MoonNight,
  },
  {
    path: '/searchTNotes',
    label: '技术部备注',
    icon: Search,
  },
  {
    path: '/clipkeeper',
    label: '剪贴板快照',
    icon: Notebook,
  },
]
</script>

<template>
  <el-menu :default-active="route.path" router class="sidebar-menu">
    <el-menu-item
      class="sidebar-menu-item"
      v-for="item in menuItems"
      :key="item.path"
      :index="item.path"
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
  background-color: var(--color-background-soft);
  z-index: 10;
}

.sidebar-menu-item {
  background-color: var(--color-background-soft);
}

.sidebar-menu-item:hover {
  background-color: var(--color-primary-hover);
}

* {
  user-select: none;
  -webkit-user-select: none;
}
</style>

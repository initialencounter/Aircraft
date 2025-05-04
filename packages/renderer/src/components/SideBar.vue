<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMaskStore } from '../stores/mask'
import {
  Box,
  Document,
  House,
  MoonNight,
  Setting,
} from '@element-plus/icons-vue'
import Clip from '../assets/svg/Clip.vue'

const router = useRouter()
const maskStore = useMaskStore()
const activeIndex = ref('1')

// 使用 computed 属性来根据解锁状态过滤菜单项
const visibleMenuItems = computed(() => {
  return menuItems.filter((item) => {
    // 如果需要解锁且未解锁，则不显示该菜单项
    return !(item.requiresUnlock && !maskStore.isUnlocked)
  })
})

const menuItems = [
  {
    index: '1',
    path: '/',
    label: '堆码计算',
    icon: Box,
    requiresUnlock: false,
  },
  {
    index: '2',
    path: '/summary_parse',
    label: '概要解析',
    icon: MoonNight,
    requiresUnlock: false,
  },
  {
    index: '3',
    path: '/blake2',
    label: 'BLAKE2',
    icon: Clip,
    requiresUnlock: false,
  },
  {
    index: '4',
    path: '/schema',
    label: '设置',
    icon: Setting,
    requiresUnlock: false,
  },
  {
    index: '5',
    path: '/logs',
    label: '日志',
    icon: Document,
    requiresUnlock: false,
  },
  {
    index: '6',
    path: '/home',
    label: '首页',
    icon: House,
    requiresUnlock: false,
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
      v-for="item in visibleMenuItems"
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
  z-index: 1;
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

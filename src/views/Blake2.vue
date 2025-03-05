<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import {ref} from "vue";
import {FileTileMap, Link} from "../types";
import FileTileTauri from "../components/FileTile.vue";
import {ElMessage} from "element-plus";
import { isTauri } from '@tauri-apps/api/core';
import { listen,Event } from '@tauri-apps/api/event';
import { ipcManager } from "../utils/ipcManager";

interface FileTileData {
  name: string,
  blake2b512: string,
  last_modified: string,
  path: string,
  color?: string
  focus?: boolean
}
let is_tauri = isTauri()

// forked from https://www.zhihu.com/question/26744174/answer/2468892079
let colorList = ['#3cb44b', '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#f032e6', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#000075', '#a9a9a9', '#ffffff', '#e6194B', '#000000']
let colorIndex = 0
const file_list = ref<FileTileMap>([]);

if (is_tauri) {
  ipcManager.invoke("switch_drag_to_blake2", { value: true });
  listen('open_link', (data: Event<Link>): void => {
    window.open(data.payload.link)
  })
  listen('file_tile', (data: Event<FileTileData>): void => {
    let msg:FileTileData = data.payload
    for (let i = 0; i < file_list.value.length; i++) {
      let value = file_list.value[i]
      if (value.md5 === msg.blake2b512) {
        msg.color = value.color
        break
      }
    }
    if (!msg.color) {
      msg.color = colorList[colorIndex]
      colorIndex++
      if (colorIndex >= colorList.length) {
        ElMessage.warning({
          message: '颜色已经用完了，请清空列表！！回收颜色！！',
          type: 'warning',
        })
      }
    }
    file_list.value.push({
      name: msg.name,
      path: msg.path,
      lastModified: msg.last_modified,
      md5: msg.blake2b512,
      color: msg.color,
      focus: false
    })
  })
}

document.oncontextmenu = function () {
  return false;
}

function handleClearList() {
  file_list.value = []
  colorIndex = 0
}
</script>

<template>
    <!-- 头部 -->
    <h1 class="noSelectTitle" data-tauri-drag-region style="font-size: 24px">&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp文件一致性校对器 </h1>
    <!-- 内容区 -->
    <br>
    <div v-if="is_tauri" class="middle-con">
      <FileTileTauri v-model="file_list" @removeItem="handleClearList"></FileTileTauri>
    </div>
    <div v-else class="middle-con">
      <h1>electron 不支持此功能</h1>
    </div>
</template>

<style scoped>
@import url('../assets/css/blake.css');
</style>
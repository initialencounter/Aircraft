<script lang='ts' setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import {ref} from 'vue';
import SparkMD5 from 'spark-md5'
import {FileTileMap, Link} from '../types';
import FileTileTauri from '../components/FileTile.vue';
import {ElMessage} from 'element-plus';
import { isTauri } from '@tauri-apps/api/core';
import { listen,Event } from '@tauri-apps/api/event';
import { ipcManager } from '../utils/ipcManager';

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
  ipcManager.invoke('switch_drag_to_blake2', { value: true });
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
} else {
  document.ondragover = dragleaveEvent
  document.ondragenter = dragleaveEvent
  document.ondragleave = dragleaveEvent
  document.ondrop = dropEvent
}

function dragleaveEvent(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
}

function dropEvent(event: DragEvent) {
  event.stopPropagation();
  event.preventDefault();
  const files = event.dataTransfer!.files;
  displayChsFile(files);
}

function displayChsFile(files: FileList) {
  for (let file_id = 0; file_id < files.length; file_id++) {
    if (file_list.value) {
      let file = files[file_id]
      getMd5(file, file_list.value.length)
      file_list.value.push({
        name: file.name,
        lastModified: formatTimestamp(file.lastModified),
        md5: 'loading...',
        color: '#000',
        path: '--',
        focus: false
      })
    }
  }
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const millisecond = date.getMilliseconds().toString().padStart(3, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${millisecond}`;
}

function getMd5(blob: Blob, id: number) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(reader.result as ArrayBuffer);
    const res = spark.end();
    if (file_list.value[id]) {
      file_list.value[id]['md5'] = res
    }
    for (let i = 0; i < file_list.value.length; i++) {
      let value = file_list.value[i]
      if (value.md5 === res) {
        file_list.value[id]['color'] = value.color
        break
      }
    }
    if (file_list.value[id]['color'] === '#000') {
      file_list.value[id]['color'] = colorList[colorIndex]
      colorIndex++
      if (colorIndex >= colorList.length) {
        ElMessage.warning({
          message: '颜色已经用完了，请清空列表！！回收颜色！！',
          type: 'warning',
        })
      }
    }
  };
  reader.onerror = () => {
    if (file_list.value) {
      file_list.value[id]['md5'] = 'Error!'
    }
  };
  reader.readAsArrayBuffer(blob);
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
    <h1 class='noSelectTitle' data-tauri-drag-region style='font-size: 24px'>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp文件一致性校对器 </h1>
    <!-- 内容区 -->
    <br>
    <div class='middle-con'>
      <FileTileTauri  v-model='file_list' @removeItem='handleClearList'></FileTileTauri>
    </div>
</template>

<style scoped>
@import url('../assets/css/blake.css');
</style>
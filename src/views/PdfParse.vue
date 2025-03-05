<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { listen, Event } from "@tauri-apps/api/event";
import { ipcManager } from "../utils/ipcManager";

let is_tauri = isTauri();
const file_list = ref<string[]>([]);

if (is_tauri) {
  ipcManager.invoke("switch_drag_to_blake2", { value: false });
  listen("pdf_reader_result", (data: Event<string[]>): void => {
    file_list.value = data.payload
  });
}

document.oncontextmenu = function () {
  return false;
};

</script>

<template>
  <!-- 头部 -->
  <h1 class="noSelectTitle" data-tauri-drag-region style="font-size: 24px">
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbspPDF解析器
  </h1>
  <!-- 内容区 -->
  <br />
  <div v-if="is_tauri" class="middle-con">
    <div v-for="file_path in file_list">
      {{ file_path }}
    </div>
  </div>
  <div v-else class="middle-con">
    <h1>electron 不支持此功能</h1>
  </div>
</template>

<style scoped>
</style>

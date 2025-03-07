<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from "vue";
import { Event } from "@tauri-apps/api/event";
import { ipcManager } from "../utils/ipcManager";
import PdfData from "../components/PdfData.vue";
import { DataModel } from "../types";

const parseResult = ref<DataModel>({
   "appraiserCName": "",
   "appraiserEName": "",
   "manufacturerCName": "",
   "manufacturerEName": "",
   "itemCName": "",
   "itemEName": "",
   "color": "",
   "shape": "",
   "size": "",
   "model": "",
   "brands": "",
   "btyCount": "",
   "netWeight": "",
   "inspectionItem2Text1": "",
   "inspectionItem2Text2": "",
   "inspectionItem3Text1": "",
    "market": ""
 });

ipcManager.invoke("switch_drag_to_blake2", { value: false });
ipcManager.on("pdf_reader_result", (data: Event<DataModel>): void => {
  parseResult.value = data.payload
});

document.oncontextmenu = function () {
  return false;
};

</script>

<template>
  <!-- 头部 -->
  <h1 class="noSelectTitle" data-tauri-drag-region style="font-size: 24px">
  </h1>
  <!-- 内容区 -->
  <br />
  <PdfData :data="parseResult" />
</template>

<style scoped>
</style>

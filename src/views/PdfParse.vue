<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from "vue";
import { Event } from "@tauri-apps/api/event";
import { ipcManager } from "../utils/ipcManager";
import PdfData from "../components/PdfData.vue";
import { DataModel } from "../types";

const parseResult = ref<DataModel>({
  appraiserCName: "",
  appraiserEName: "",
  manufacturerCName: "",
  manufacturerEName: "",
  itemCName: "",
  itemEName: "",
  color: "",
  shape: "",
  size: "",
  model: "",
  brands: "",
  btyCount: "",
  netWeight: "",
  inspectionItem2Text1: "",
  inspectionItem2Text2: "",
  inspectionItem3Text1: "",
  market: "",
});

const showRawText = ref(true);
const rawText = ref("");
ipcManager.invoke("switch_drag_to_blake2", { value: false });
ipcManager.on("pdf_reader_result", (data: Event<string>): void => {
  try {
    showRawText.value = false;
    parseResult.value = JSON.parse(data.payload) as DataModel;
  } catch (e) {
    showRawText.value = true;
    rawText.value = data.payload;
  }
});

document.oncontextmenu = function () {
  return false;
};
</script>

<template>
  <!-- 头部 -->
  <h1 class="noSelectTitle" data-tauri-drag-region style="font-size: 24px"></h1>
  <!-- 内容区 -->
  <br />
  <div v-if="!showRawText">
    <PdfData :data="parseResult" />
  </div>
  <div v-else>
    <el-input
      class="rawText"
      v-model="rawText"
      style="width: 100%"
      :rows="15"
      type="textarea"
      placeholder="请拖拽报告到此次区域"
    />
  </div>
</template>

<style scoped></style>

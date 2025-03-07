<template>
  <el-descriptions border :column="2">
    <template v-for="item in displayData" :key="item.label">
      <el-descriptions-item
        :label="item.label"
        label-class-name="my-label"
        class-name="my-content"
      >
        <div class="value-container" @click="handleCopy(item.value)">
          <span>{{ item.value || "/" }}</span>
        </div>
      </el-descriptions-item>
    </template>
  </el-descriptions>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import {
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
} from "element-plus";
import type { DataModel } from "../types";

const props = defineProps<{
  data: DataModel;
}>();

const labelMap: Record<keyof DataModel, string> = {
  appraiserCName: "委托方中文名称",
  manufacturerCName: "制造商或生产工厂中文名称",
  appraiserEName: "委托方英文名称",
  manufacturerEName: "制造商或生产工厂英文名称",
  itemCName: "中文名称",
  itemEName: "英文名称",
  color: "颜色",
  shape: "形状",
  size: "尺寸",
  model: "型号",
  brands: "商标",
  btyCount: "数量",
  netWeight: "净重",
  inspectionItem2Text1: "电压",
  inspectionItem2Text2: "容量",
  inspectionItem3Text1: "瓦时",
  market: "报告编号",
};
const renderOrder = [
  "appraiserCName",
  "appraiserEName",
  "manufacturerCName",
  "manufacturerEName",
  "itemCName",
  "itemEName",
  "color",
  "shape",
  "size",
  "model",
  "brands",
  "btyCount",
  "netWeight",
  "inspectionItem2Text1",
  "inspectionItem2Text2",
  "inspectionItem3Text1",
  "market",
];
const displayData = computed(() => {
  let res = [];
  for (const key of renderOrder) {
    res.push({
      label: labelMap[key as keyof DataModel],
      value: props.data[key as keyof DataModel]?.toString() || "",
    });
  }
  return res
});

const handleCopy = async (text: string) => {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success({
      message: "已复制到剪贴板",
      type: "success",
    });
  } catch (err) {
    console.error("复制失败:", err);
    ElMessage.error({
      message: "复制失败",
      type: "error",
    });
  }
};
</script>

<style scoped>
:deep(.my-label) {
  background: #333 !important;
}
:deep(.my-content) {
  background: #000;
}
:deep(.my-content:hover) {
  background: #2d4531;
}
</style>

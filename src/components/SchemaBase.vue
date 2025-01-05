<!-- App.vue -->
<template>
  <el-button class="schema-button" type="primary" @click="saveBaseConfig"
    >保存配置</el-button
  >
  <el-button class="schema-button" type="primary" @click="resetConfig"
    >重置</el-button
  >

  <k-form v-model="config" :schema="BaseConfig" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Schema from "schemastery";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";
import { useMaskStore } from "../stores/mask";
import type { BaseConfig } from "../stores/mask";

const BaseConfig = Schema.object({
  auto_start: Schema.boolean().description("开机自启").default(false),
  silent_start: Schema.boolean().description("静默启动").default(false),
  nothing: Schema.string().description("这里什么也没有").default("").hidden(true),
});

const config = ref<BaseConfig>({
  auto_start: false,
  silent_start: false,
  nothing: "",
});
const initial = ref<BaseConfig>({
  auto_start: false,
  silent_start: false,
  nothing: "",
});

const maskStore = useMaskStore();
const isDev = isTauri();
async function getBaseConfig() {
  if (!isDev) {
    return;
  }
  const result = await invoke<BaseConfig>("get_base_config");
  config.value = result;
}

async function saveBaseConfig() {
  if (!isDev) {
    return;
  }
  try {
    maskStore.unlock(config.value.nothing);
    const tmpConfig: BaseConfig = new BaseConfig(config.value);
    await invoke("save_base_config", { config: tmpConfig });
    ElMessage.success(`保存成功`);
  } catch (error) {
    ElMessage.error(JSON.stringify(error));
  }
}
function resetConfig() {
  config.value = initial.value;
}

onMounted(() => {
  getBaseConfig();
});

onBeforeUnmount(() => {
  maskStore.unlock("");
});

</script>

<style scoped>
.schema-button {
  background-color: #1e1e20;
}
.schema-button:hover {
  background-color: #4f9633;
}
</style>

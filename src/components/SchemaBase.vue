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
import { ref, onMounted } from "vue";
import Schema from "schemastery";
import { ElMessage } from "element-plus";
import { ipcManager } from "../utils/ipcManager";

export interface BaseConfig {
  auto_start: boolean;
  silent_start: boolean;
  nothing: string;
}

const BaseConfig = Schema.object({
  auto_start: Schema.boolean().description("开机自启").default(false),
  silent_start: Schema.boolean().description("静默启动").default(false),
  nothing: Schema.string()
    .description("这里什么也没有")
    .default("")
    .hidden(true),
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

async function getBaseConfig() {
  const result = (await ipcManager.invoke("get_base_config")) as BaseConfig;
  config.value = result;
}

async function saveBaseConfig() {
  try {
    const tmpConfig: BaseConfig = new BaseConfig(config.value);
    await ipcManager.invoke("save_base_config", { config: tmpConfig });
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

</script>

<style scoped>
.schema-button {
  background-color: #1e1e20;
}
.schema-button:hover {
  background-color: #4f9633;
}
</style>

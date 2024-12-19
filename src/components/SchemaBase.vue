<!-- App.vue -->
<template>
  <el-button class="schema-button" type="primary" @click="saveBaseConfig">保存配置</el-button>
  <el-button class="schema-button" type="primary" @click="resetConfig">重置</el-button>

  <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
  
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import Schema from "schemastery";
import {invoke, isTauri} from '@tauri-apps/api/core';
import {ElMessage} from "element-plus";

interface Config {
  auto_login: boolean;
  auto_start: boolean;
  silent_start: boolean;
}

const Config = Schema.object({
  auto_login: Schema.boolean().description("自动登录").default(false),
  auto_start: Schema.boolean().description("开机自启").default(false),
  silent_start: Schema.boolean().description("静默启动").default(false),
});

const config = ref<Config>({
  auto_login: false,
  auto_start: false,
  silent_start: false,
});
const initial = ref<Config>({
  auto_login: false,
  auto_start: false,
  silent_start: false,
});

const isDev = isTauri();
async function getBaseConfig() {
  if (!isDev) {
    return;
  }
  const result = await invoke<Config>("get_base_config");
  config.value = result;
}

async function saveBaseConfig(){
  if (!isDev){
    return
  }
  try {
    const tmpConfig: Config = new Config(config.value)
    await invoke('save_base_config', {config: tmpConfig})
    ElMessage.success(`保存成功`)
  } catch (error) {
    ElMessage.error(JSON.stringify(error))
  }
}
function resetConfig(){
  config.value = initial.value
}


onMounted(() => {
  getBaseConfig()
})
</script>

<style scoped>
.schema-button {
  background-color: #1e1e20;
}
.schema-button:hover {
  background-color: #4f9633;
}
</style>

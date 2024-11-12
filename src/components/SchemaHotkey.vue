<template>
  <el-button class="schema-button" type="primary" @click="reloadConfig">重载配置</el-button>
  <el-button class="schema-button" type="primary" @click="saveConfig">保存配置</el-button>
  <el-button class="schema-button" type="primary" @click="resetConfig">重置</el-button>
  <el-button class="schema-button" type="primary" @click="stopHotkeyListener">停止监听</el-button>

  <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import Schema from "schemastery";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ElMessage } from "element-plus";

interface Config {
  doc_enable: boolean;
  doc_key: string;
  upload_enable: boolean;
  upload_key: string;
  copy_enable: boolean;
  copy_key: string;
  docx_enable: boolean;
  docx_key: string;
}

const Config = Schema.object({
  doc_enable: Schema.boolean().description("开启doc写入").default(false),
  doc_key: Schema.string().description("doc写入快捷键").default(""),
  upload_enable: Schema.boolean()
    .description("开启上传资料快捷键")
    .default(false),
  upload_key: Schema.string().description("上传资料快捷键").default(""),
  copy_enable: Schema.boolean().description("开启复制快捷键").default(false),
  copy_key: Schema.string().description("复制快捷键").default(""),
  docx_enable: Schema.boolean()
    .description("开启docx替换快捷键")
    .default(false),
  docx_key: Schema.string().description("docx替换快捷键").default(""),
}).description("快捷键设置");

const config = ref<Config>({
  doc_enable: false,
  doc_key: "ctrl+shift+d",
  copy_enable: false,
  copy_key: "ctrl+shift+z",
  upload_enable: false,
  upload_key: "ctrl+shift+u",
  docx_enable: false,
  docx_key: "ctrl+shift+x",
});
const initial = ref<Config>({
  doc_enable: false,
  doc_key: "ctrl+shift+d",
  upload_enable: false,
  upload_key: "ctrl+shift+u",
  copy_enable: false,
  copy_key: "ctrl+shift+z",
  docx_enable: false,
  docx_key: "ctrl+shift+x",
});

const isDev = isTauri();

async function getConfig() {
  if (!isDev) {
    return;
  }
  config.value = await invoke("get_hotkey_config");
}
async function saveConfig() {
  if (!isDev) {
    return;
  }
  try {
    const tmpConfig: Config = new Config(config.value);
    const result = await invoke("save_hotkey_config", { config: tmpConfig });
    ElMessage.success(`保存成功: ${JSON.stringify(result)}`);
  } catch (error) {
    ElMessage.error(JSON.stringify(error));
  }
}
function resetConfig() {
  config.value = initial.value;
}

async function reloadConfig() {
  const tmpConfig: Config = new Config(config.value);
  await invoke("reload_hotkey_listener", { config: tmpConfig });
  ElMessage.success("重载成功");
}

async function stopHotkeyListener() {
  await invoke("stop_hotkey_listener");
  ElMessage.success("停止成功");
}

onMounted(() => {
  getConfig();
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

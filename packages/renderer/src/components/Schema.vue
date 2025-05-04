<!-- App.vue -->
<template>
  <el-button class="schema-button" type="primary" @click="reloadConfig"
    >重载配置</el-button
  >
  <el-button class="schema-button" type="primary" @click="saveConfig"
    >保存配置</el-button
  >
  <el-button class="schema-button" type="primary" @click="resetConfig"
    >重置</el-button
  >
  <k-form v-model="config" :schema="ConfigSchema" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcManager } from '../utils/ipcManager'
import { Config, ConfigSchema } from '../schema'

const config = ref<Config>({
  server: {
    baseUrl: 'https://',
    username: '',
    password: '',
    port: 25455,
    debug: false,
    logEnabled: false,
  },
  base: {
    autoStart: false,
    silentStart: false,
    nothing: '',
  },
  hotkey: {
    docEnable: false,
    docKey: 'ctrl+shift+d',
    copyEnable: false,
    copyKey: 'ctrl+shift+z',
    uploadEnable: false,
    uploadKey: 'ctrl+shift+u',
    docxEnable: false,
    docxKey: 'ctrl+shift+x',
    inspector: '',
    signatureWidth: 5.58,
    signatureHeight: 1.73,
  },
  llm: {
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    model: 'moonshot-v1-128k',
  },
})
const initial = ref<Config>({
  server: {
    baseUrl: 'https://',
    username: '',
    password: '',
    port: 25455,
    debug: false,
    logEnabled: false,
  },
  base: {
    autoStart: false,
    silentStart: false,
    nothing: '',
  },
  hotkey: {
    docEnable: false,
    docKey: 'ctrl+shift+d',
    copyEnable: false,
    copyKey: 'ctrl+shift+z',
    uploadEnable: false,
    uploadKey: 'ctrl+shift+u',
    docxEnable: false,
    docxKey: 'ctrl+shift+x',
    inspector: '',
    signatureWidth: 5.58,
    signatureHeight: 1.73,
  },
  llm: {
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    model: 'moonshot-v1-128k',
  },
})

async function getConfig() {
  const appConfig = await ipcManager.invoke('get_config')
  config.value = appConfig
  config.value.llm.apiKey = appConfig.llm.apiKey
}
async function saveConfig() {
  try {
    const tmpConfig: Config = new ConfigSchema(config.value)
    const result = await ipcManager.invoke('save_config', {
      config: tmpConfig,
    })
    ElMessage.success(`保存成功: ${JSON.stringify(result)}`)
  } catch (error) {
    ElMessage.error(JSON.stringify(error))
  }
}

function resetConfig() {
  config.value = initial.value
}

async function reloadConfig() {
  const tmpConfig: Config = new ConfigSchema(config.value)
  await ipcManager.invoke('reload_config', { config: tmpConfig })
  ElMessage.success('重载成功')
}

onMounted(() => {
  getConfig()
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

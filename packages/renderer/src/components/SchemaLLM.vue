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
  <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import Schema from 'schemastery'
import {ElMessage} from 'element-plus'
import {ipcManager} from '../utils/ipcManager'
import {LlmConfig} from 'aircraft-rs'

const Config: Schema<LlmConfig> = Schema.object({
  baseUrl: Schema.string()
    .description('平台接口域名')
    .default('https://api.moonshot.cn/v1'),
  apiKey: Schema.string().description('API key').role('secret').default(''),
  model: Schema.string().description('模型').default('moonshot-v1-128k'),
}).description('服务设置')

const config = ref<LlmConfig>({
  baseUrl: 'https://api.moonshot.cn/v1',
  apiKey: '',
  model: 'moonshot-v1-128k',
})
const initial = ref<LlmConfig>({
  baseUrl: 'https://api.moonshot.cn/v1',
  apiKey: '',
  model: 'moonshot-v1-128k',
})

async function getConfig() {
  config.value = (await ipcManager.invoke('get_llm_config')) as LlmConfig
}
async function saveConfig() {
  try {
    const tmpConfig: LlmConfig = new Config(config.value)
    const result = await ipcManager.invoke('save_llm_config', {
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
  const tmpConfig: LlmConfig = new Config(config.value)
  await ipcManager.invoke('reload_llm_config', { config: tmpConfig })
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

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
  <el-button class="schema-button" type="primary" @click="stopServer"
    >停止服务</el-button
  >
  <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import Schema from 'schemastery'
import { ElMessage } from 'element-plus'
import { ipcManager } from '../utils/ipcManager'

interface Config {
  base_url: string
  username: string
  password: string
  port: number
  debug: boolean
  log_enabled: boolean
}

const Config = Schema.object({
  base_url: Schema.string().description('登录域名').default('https://'),
  username: Schema.string().description('用户名').default(''),
  password: Schema.string().description('密码').role('secret').default(''),
  port: Schema.number().description('端口').default(25455),
  debug: Schema.boolean().description('调试模式').default(true),
  log_enabled: Schema.boolean().description('日志记录').default(true),
}).description('服务设置')

const config = ref<Config>({
  base_url: 'https://',
  username: '',
  password: '',
  port: 25455,
  debug: false,
  log_enabled: false,
})
const initial = ref<Config>({
  base_url: 'https://',
  username: '',
  password: '',
  port: 25455,
  debug: false,
  log_enabled: false,
})

async function getConfig() {
  config.value = (await ipcManager.invoke('get_server_config')) as Config
}
async function saveConfig() {
  try {
    const tmpConfig: Config = new Config(config.value)
    const result = await ipcManager.invoke('save_server_config', {
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
  const tmpConfig: Config = new Config(config.value)
  await ipcManager.invoke('reload_config', { config: tmpConfig })
  ElMessage.success('重载成功')
}

async function stopServer() {
  await ipcManager.invoke('stop_server')
  ElMessage.success('停止成功')
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

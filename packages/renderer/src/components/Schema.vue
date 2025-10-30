<!-- App.vue -->
<template>
  <div class="fixed-element">
    <el-button class="schema-button" type="primary" @click="reloadConfig"
      >重载配置</el-button
    >
    <el-button class="schema-button" type="primary" @click="saveConfig"
      >保存配置</el-button
    >
    <el-button class="schema-button" type="primary" @click="resetConfig"
      >重置</el-button
    >
  </div>
  <k-form class="config-schema" v-model="config" :schema="ConfigSchema" :initial="initial"></k-form>
  <!-- 添加遮罩层 - 现在相对于容器定位 -->
  <div class="loading-mask" v-if="loading" @dblclick="loading = false">
    <div class="loading-content">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>正在保存配置，请稍候...<br />双击关闭遮罩</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcManager } from '../utils/ipcManager'
import { Config, ConfigSchema } from '../schema'

const defaultConfig: Config = {
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
    copyEnable: false,
    copyKey: 'ctrl+shift+z',
    uploadEnable: false,
    uploadKey: 'ctrl+shift+u',
    customHotkey: [
      {
        hotkey: 'ctrl+NUMPADADD',
        cmd: 'calc',
      },
    ],
  },
  llm: {
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    model: 'moonshot-v1-128k',
  },
  other: {
    queryServerHost: '192.168.0.195',
  },
}
const loading = ref(false)
const config = ref<Config>(defaultConfig)
const initial = ref<Config>(defaultConfig)

async function getConfig() {
  const appConfig = await ipcManager.invoke('get_config')
  config.value = appConfig
  config.value.llm.apiKey = appConfig.llm.apiKey
}
async function saveConfig() {
  const tmpConfig: Config = new ConfigSchema(config.value)
  loading.value = true
  try {
    const result = await ipcManager.invoke('save_config', {
      config: tmpConfig,
    })
    ElMessage.success(`保存成功: ${JSON.stringify(result)}`)
  } catch (error) {
    ElMessage.error(JSON.stringify(error))
  } finally {
    loading.value = false
  }
}

function resetConfig() {
  config.value = initial.value
}

async function reloadConfig() {
  const tmpConfig: Config = new ConfigSchema(config.value)
  loading.value = true
  try {
    await ipcManager.invoke('reload_config', { config: tmpConfig })
    ElMessage.success('重载成功')
  } catch {
    ElMessage.error('重载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getConfig()
})
</script>

<style scoped>
.fixed-element {
  position: fixed;
  top: 60px;
  left: 150px;
  z-index: 999;
}
.config-schema {
  margin-top: 50px; /* 给按钮留出空间 */
}
.schema-button {
  background-color: #1e1e20;
}
.schema-button:hover {
  background-color: #4f9633;
}
.loading-mask {
  position: absolute; /* 改为绝对定位，相对于.pdf-parse-container */
  top: 0;
  left: 0;
  width: 100%;
  height: 180%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10; /* 降低z-index，只要能覆盖当前组件即可 */
}

.loading-content {
  padding: 20px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white; /* 确保文字在深色背景上可见 */
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 10px;
  animation: rotate 1.5s linear infinite;
}
</style>

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
  <el-button class="schema-button" type="primary" @click="stopHotkeyListener"
    >停止监听</el-button
  >
  <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import Schema from 'schemastery'
import { ElMessage } from 'element-plus'
import { ipcManager } from '../utils/ipcManager'
import type { HotkeyConfig } from 'aircraft-rs'

const Config: Schema<HotkeyConfig> = Schema.object({
  docEnable: Schema.boolean().description('开启doc写入').default(false),
  docKey: Schema.string().description('doc写入快捷键').default(''),
  uploadEnable: Schema.boolean()
    .description('开启上传资料快捷键')
    .default(false),
  uploadKey: Schema.string().description('上传资料快捷键').default(''),
  copyEnable: Schema.boolean().description('开启复制快捷键').default(false),
  copyKey: Schema.string().description('复制快捷键').default(''),
  docxEnable: Schema.boolean().description('开启docx替换快捷键').default(false),
  docxKey: Schema.string().description('docx替换快捷键').default(''),
  inspector: Schema.string().description('检验员').default(''),
  signatureWidth: Schema.number().description('签名宽度').default(5.58),
  signatureHeight: Schema.number().description('签名高度').default(1.73),
}).description('快捷键设置')

const config = ref<HotkeyConfig>({
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
})
const initial = ref<HotkeyConfig>({
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
})

async function getConfig() {
  config.value = (await ipcManager.invoke('get_hotkey_config')) as HotkeyConfig
}
async function saveConfig() {
  try {
    const tmpConfig: HotkeyConfig = new Config(config.value)
    const result = await ipcManager.invoke('save_hotkey_config', {
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
  const tmpConfig: HotkeyConfig = new Config(config.value)
  await ipcManager.invoke('reload_hotkey_listener', { config: tmpConfig })
  ElMessage.success('重载成功')
}

async function stopHotkeyListener() {
  await ipcManager.invoke('stop_hotkey_listener')
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

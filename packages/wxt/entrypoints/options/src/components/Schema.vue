<template>
  <div class="fixed-button-container">
    <el-row class="row-bg" justify="end">
      <el-button class="el-button-export" @click="exportConfig"
        >导出配置</el-button
      >
      <el-button class="el-button-import" @click="centerDialogVisible = true"
        >导入配置</el-button
      >
    </el-row>
  </div>
  <div class="form-container">
    <k-form v-model="config" :schema="Config" :initial="initial"></k-form>
  </div>
  <el-dialog
    v-model="centerDialogVisible"
    title="导入配置"
    width="500"
    destroy-on-close
    center
  >
    <template #footer>
      <textarea
        v-model="importText"
        style="width: 100%"
        :rows="6"
        type="textarea"
        placeholder="请输入您要导入的配置信息"
      ></textarea>

      <div class="dialog-footer">
        <el-button type="primary" @click="centerDialogVisible = false">
          取消
        </el-button>
        <el-button @click="importConfig">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { Config } from './Schema'

// 判断是否处于开发环境
const centerDialogVisible = ref(false)
const importText = ref('')

// 防抖函数
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// 防抖保存函数
const debouncedSave = debounce(() => {
  saveConfig()
}, 100)

const saveConfig = () => {
  try {
    const tmpConfig = new Config(config.value)
    chrome.storage.local.set(tmpConfig)
    ElMessage({
      message: '保存成功',
      type: 'success',
      plain: true,
      duration: 500,
    })
  } catch (error) {
    ElMessage({
      message: '保存失败，请检查配置',
      type: 'error',
      plain: true,
    })
    return
  }
}

const config = ref<Config | null>(null)
const initial = ref<Config | null>(null)

// 监听配置变化
watch(
  config,
  (newConfig, oldConfig) => {
    if (oldConfig && newConfig) debouncedSave(newConfig)
  },
  {
    deep: true, // 深度监听对象属性变化
    immediate: false, // 不立即执行
  }
)

chrome.storage.local.get(
  Object.keys(new Config()) as (keyof Config)[],
  (data: Config) => {
    initial.value = JSON.parse(JSON.stringify(data))
    config.value = JSON.parse(JSON.stringify(data))
  }
)

const exportConfig = () => {
  // set clipboard
  navigator.clipboard.writeText(JSON.stringify(new Config(config.value)))
  ElMessage({
    message: '导出成功，配置信息已复制到剪贴板，请妥善保存',
    type: 'success',
    plain: true,
  })
}

const importConfig = () => {
  centerDialogVisible.value = false
  // get clipboard
  try {
    const tmpConfig = new Config(JSON.parse(importText.value))
    config.value = tmpConfig
    saveConfig()
    document.location.reload()
    ElMessage({
      message: '导入成功',
      type: 'success',
      plain: true,
    })
  } catch (error) {
    ElMessage({
      message: '导入失败，请检查剪切板中是否存在配置信息',
      type: 'error',
      plain: true,
    })
  }
}
</script>

<style>
.fixed-button-container {
  padding: 10px;
  border-radius: 4px;
}

.el-row {
  margin-bottom: 20px;
}
.el-row:last-child {
  margin-bottom: 0;
}
.el-col {
  border-radius: 4px;
}

.grid-content {
  border-radius: 4px;
  min-height: 36px;
}
.grid-content {
  background-color: aliceblue;
}
.el-button-save {
  background-color: rgb(66, 128, 66);
  color: #000;
}
.el-button-reset {
  background-color: rgb(128, 128, 128);
  color: #000;
}

.el-button-reset:hover {
  background-color: rgb(233, 87, 57);
}
.el-button-export {
  background-color: rgb(57, 108, 99);
}
.el-button-import {
  background-color: rgb(131, 37, 165);
}
</style>

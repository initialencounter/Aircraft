<template>
  <div class="clipkeeper-container">
    <div class="header">
      <h1>剪贴板快照管理</h1>
      <el-button
        class="clipkeeper-button"
        type="success"
        @click="handleReload"
        :icon="Refresh"
        :loading="reloading"
      >
        重载配置
      </el-button>
      <el-button
        class="clipkeeper-button"
        type="primary"
        @click="openAddDialog"
        :icon="Plus"
      >
        添加快照配置
      </el-button>
    </div>

    <div class="configs-list">
      <el-empty v-if="configs.length === 0" description="暂无剪贴板快照配置" />

      <el-card
        v-for="config in configs"
        :key="config.clipboardContentName"
        class="config-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <span class="config-name">{{ config.clipboardContentName }}</span>
            <div class="card-actions">
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDelete(config.clipboardContentName)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>

        <div class="hotkeys-container">
          <div class="hotkeys-label">快捷键:</div>
          <div class="hotkeys-list">
            <el-tag
              v-for="(hotkey, index) in config.hotkeys"
              :key="index"
              class="hotkey-tag"
              size="large"
            >
              {{ hotkey }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 添加配置对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加剪贴板快照配置"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="newConfig"
        :rules="rules"
        ref="formRef"
        label-width="120px"
      >
        <el-form-item label="配置名称" prop="clipboardContentName">
          <el-input
            v-model="newConfig.clipboardContentName"
            placeholder="请输入配置名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="快捷键" prop="hotkeys">
          <div class="hotkey-input-container">
            <el-input
              v-model="currentHotkey"
              placeholder="请输入快捷键，例如: Ctrl+Shift+A"
              clearable
              @keydown="handleHotkeyInput"
            >
              <template #append>
                <el-button @click="addHotkey" :icon="Plus">添加</el-button>
              </template>
            </el-input>

            <div v-if="newConfig.hotkeys.length > 0" class="hotkey-list">
              <el-tag
                v-for="(hotkey, index) in newConfig.hotkeys"
                :key="index"
                closable
                @close="removeHotkey(index)"
                class="hotkey-tag"
              >
                {{ hotkey }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAdd" :loading="adding">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import { apiManager } from '../utils/api'

interface ClipboardHotkey {
  hotkeys: string[]
  clipboardContentName: string
}

const configs = ref<ClipboardHotkey[]>([])
const dialogVisible = ref(false)
const adding = ref(false)
const reloading = ref(false)
const currentHotkey = ref('')
const formRef = ref<FormInstance>()

const newConfig = ref<ClipboardHotkey>({
  hotkeys: [],
  clipboardContentName: '',
})

const rules: FormRules = {
  clipboardContentName: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' },
  ],
  hotkeys: [
    {
      validator: (_rule, _value, callback) => {
        if (newConfig.value.hotkeys.length === 0) {
          callback(new Error('请至少添加一个快捷键'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

// 加载配置列表
const loadConfigs = async () => {
  try {
    const result = await apiManager.get('/get_clipboard_snapshot_configs')
    configs.value = result || []
  } catch (error) {
    ElMessage.error('加载配置失败: ' + (error as Error).message)
    console.error('加载配置失败:', error)
  }
}

// 打开添加对话框
const openAddDialog = () => {
  newConfig.value = {
    hotkeys: [],
    clipboardContentName: '',
  }
  currentHotkey.value = ''
  dialogVisible.value = true
}

// 处理快捷键输入
const handleHotkeyInput = (event: KeyboardEvent) => {
  event.preventDefault()

  const keys: string[] = []
  if (event.ctrlKey) keys.push('Ctrl')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')
  if (event.metaKey) keys.push('Meta')

  const key = event.key
  if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
    keys.push(key.toUpperCase())
  }

  if (keys.length > 0) {
    currentHotkey.value = keys.join('+')
  }
}

// 添加快捷键
const addHotkey = () => {
  if (!currentHotkey.value.trim()) {
    ElMessage.warning('请输入快捷键')
    return
  }

  if (newConfig.value.hotkeys.includes(currentHotkey.value)) {
    ElMessage.warning('该快捷键已存在')
    return
  }

  newConfig.value.hotkeys.push(currentHotkey.value)
  currentHotkey.value = ''
}

// 移除快捷键
const removeHotkey = (index: number) => {
  newConfig.value.hotkeys.splice(index, 1)
}

// 添加配置
const handleAdd = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    adding.value = true
    try {
      await apiManager.post('/add_clipboard_snapshot_config', newConfig.value)
      ElMessage.success('添加成功')
      dialogVisible.value = false
      await loadConfigs()
    } catch (error) {
      ElMessage.error('添加失败: ' + (error as Error).message)
      console.error('添加配置失败:', error)
    } finally {
      adding.value = false
    }
  })
}

// 删除配置
const handleDelete = async (contentName: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除配置 "${contentName}" 吗？此操作不可恢复。`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await apiManager.post('/remove_clipboard_snapshot_config', contentName)
    ElMessage.success('删除成功')
    await loadConfigs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error as Error).message)
      console.error('删除配置失败:', error)
    }
  }
}

// 重载配置
const handleReload = async () => {
  reloading.value = true
  try {
    await apiManager.post('/reload_clipboard_snapshot_configs', {})
    ElMessage.success('重载成功')
    await loadConfigs()
  } catch (error) {
    ElMessage.error('重载失败: ' + (error as Error).message)
    console.error('重载配置失败:', error)
  } finally {
    reloading.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.clipkeeper-container {
  padding: 16px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header h1 {
  margin: 0;
  font-size: 20px;
  color: #b5b5b5;
}

.configs-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 2px;
}

.config-card {
  margin-bottom: 12px;
}

.config-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.config-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-name {
  font-size: 16px;
  font-weight: 600;
  color: #dedede;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.hotkeys-container {
  padding: 0;
}

.hotkeys-label {
  font-size: 13px;
  color: #ffffff;
  margin-bottom: 6px;
  font-weight: 500;
}

.hotkeys-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hotkey-tag {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  padding: 4px 8px;
}

.footer {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
}

.hotkey-input-container {
  width: 100%;
}

.hotkey-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 滚动条样式 */
.configs-list::-webkit-scrollbar {
  width: 8px;
}

.configs-list::-webkit-scrollbar-track {
  border-radius: 4px;
}

.configs-list::-webkit-scrollbar-thumb {
  border-radius: 4px;
}

.clipkeeper-button {
  background-color: #1e1e20;
}
.clipkeeper-button:hover {
  background-color: #4f9633;
}

:deep(.el-card) {
  background: #363636;
}

:deep(.el-tag) {
  background: #339696;
  color: #c2c2c2;
}
</style>

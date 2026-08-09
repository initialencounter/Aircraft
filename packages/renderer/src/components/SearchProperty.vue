<template>
  <div class="container">
    <div class="search-wrapper">
      <label :for="type">{{ label }}:</label>
      <div class="input-group">
        <input
          type="text"
          v-model="queryText"
          :id="type"
          :style="{backgroundColor: 'var(--color-background)'}"
          placeholder="请输入搜索内容"
        />
        <el-button type="submit" @click="submitQuery">查询</el-button>
        <input type="text" v-model="host" placeholder="服务器IP" :style="{backgroundColor: 'var(--color-background)'}"/>
        <el-button type="submit" @click="saveHost">保存</el-button>
      </div>
    </div>
    <main>
      <DataForm :tableData="dataList" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useSearchStore } from '../stores/search'
import DataForm from './Form.vue'
import { onMounted, ref, watch } from 'vue'
import { ElLoading } from 'element-plus'
import { Config, DataModel } from 'aircraft-rs'
import { apiManager } from '../utils/api'

const searchStore = useSearchStore()
const props = defineProps<{
  type: string
  endpoint: string
  label: string
}>()

const queryText = ref(searchStore.lastQuery[props.type])
const host = ref('')

watch(queryText, (newVal: string) => {
  searchStore.setLastQuery(props.type, newVal)
})

const dataList = ref<DataModel[]>(searchStore.searchResults[props.type])

const saveHost = async () => {
  try {
    const currentConfig: Config = await apiManager.get('/get-config')
    currentConfig.other.queryServerHost = host.value
    await apiManager.post('/save-config', currentConfig)
    alert('保存成功')
  } catch (error) {
    console.error('保存配置出错:', error)
    alert('保存失败，请检查控制台日志')
  }
}

const submitQuery = async () => {
  const loading = ElLoading.service({
    lock: true,
    text: '加载中...',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    const endpoint = props.endpoint
    const data = (await apiManager.post('/search-property', {
      url: `http://${host.value}:4000/${endpoint}`,
      searchText: queryText.value.trim(),
    })) as DataModel[]

    searchStore.setSearchResults(props.type, data)
    dataList.value = data
  } catch (error) {
    console.error('查询出错:', error)
  } finally {
    loading.close()
  }
}

onMounted(() => {
  apiManager.get('/get-config').then((res: Config) => {
    if (res) {
      host.value = res.other.queryServerHost
    }
  })
})
</script>

<style scoped>
.search-wrapper {
  margin: 0 1rem 0 1rem;
}
.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
}

.input-group input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}

button {
  padding: 8px 20px;
  background-color: var(--color-primary);
  color: var(--color-on-dark);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: var(--color-primary-hover);
}

button:active {
  background-color: var(--color-primary-active);
}
</style>

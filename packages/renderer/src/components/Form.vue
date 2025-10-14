<template>
  <div class="table-container">
    <el-table
      :data="tableData"
      style="width: 100%"
      stripe
      border
      :max-height="800"
      :row-class-name="setRowClass"
      @cell-click="handleCellClick"
    >
      <el-table-column
        prop="projectNo"
        label="项目编号"
        width="200"
        fixed="left"
        sortable
      >
        <template #default="scope">
          <span
            >{{ scope.row.projectNo }}
            <el-button
              size="small"
              type="primary"
              :icon="Folder"
              circle
              style="margin-left: 8px; width: 24px; height: 24px"
              @click="openINFolder(scope.row.projectNo)"
          /></span>
        </template>
      </el-table-column>
      <el-table-column prop="reportNo" label="报告编号" width="150" sortable />
      <el-table-column
        prop="itemCName"
        label="项目名称"
        min-width="150"
        sortable
      />
      <el-table-column prop="assigneeName" label="提交人" width="70" sortable />
      <el-table-column
        prop="principalName"
        label="委托方"
        width="100"
        sortable
      />
      <el-table-column
        prop="appraiserName"
        label="主检员"
        width="70"
        sortable
      />
      <el-table-column prop="auditorName" label="审核员" width="70" sortable />
      <el-table-column prop="displayStatus" label="状态" width="90" sortable />
      <el-table-column
        prop="submitDate"
        label="提交日期"
        width="120"
        sortable
      />
      <el-table-column
        prop="tnotes"
        label="技术部备注"
        min-width="150"
        sortable
      />
      <el-table-column
        prop="mnotes"
        label="市场部备注"
        min-width="200"
        sortable
      />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import type { DataModel } from '../types'
import { ElMessage } from 'element-plus'
import { Folder } from '@element-plus/icons-vue'
import { ipcManager } from '../utils/ipcManager'
import { SearchResult } from 'aircraft-rs'

defineProps<{
  tableData: DataModel[]
}>()

// 设置行的类名
const setRowClass = (row: { row: DataModel }) => {
  let systemId = row.row?.projectNo?.slice(0, 3) // 获取系统ID
  switch (systemId) {
    case 'PEK':
      return 'row-green'
    case 'SEK':
      return 'row-blue'
    case 'AEK':
      return 'row-purple'
    case 'REK':
      return 'row-red'
    default:
      return 'row-withe'
  }
}

async function openINFolder(projectNo: string) {
  console.log('Opening folder for projectNo:', projectNo)
  const projectDir = await getGoodsPath(projectNo)
  if (!projectDir) {
    ElMessage.error('未找到对应的项目文件夹')
    return
  }
  ipcManager.invoke('open_local_dir', { target: projectDir })
}

async function getGoodsPath(projectNo: string): Promise<string> {
  const searchRes = (await ipcManager.invoke('search_file', {
    fileName: projectNo,
  })) as SearchResult[]
  return (
    searchRes.filter((item) => item.name.endsWith(`${projectNo}.pdf`))[0]
      ?.path || ''
  )
}

// 处理单元格点击事件
const handleCellClick = (cell: HTMLElement) => {
  const text = cell.innerText.trim() // 获取单元格内容
  if (text) {
    // 使用隐藏的输入框进行复制
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success(`已复制: ${text}`)
  }
}
</script>

<style scoped>
.table-container {
  padding: 16px 24px;
  overflow-x: auto;
}

:deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-header-bg-color: var(--el-fill-color-light);
  margin: 0 auto;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #151517; /* stripe 斑马条纹的背景颜色 */
}

:deep(.row-green) {
  color: #51a020 !important;
}

:deep(.row-blue) {
  color: #3e8ed0 !important;
}

:deep(.row-purple) {
  color: #8c1af6 !important;
}

:deep(.row-red) {
  color: #ea3323 !important;
}

/* 优化表格在小屏幕上的显示 */
@media screen and (max-width: 1400px) {
  .table-container {
    padding: 12px;
  }
}
</style>

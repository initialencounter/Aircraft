<script lang="ts" setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SingleFileDropzone from '../components/SingleFileDropzone.vue'
import {
  buildDropStackRows,
  parseDropStackReport,
  type DropStackSummary,
  type DropStackTableRow,
} from '../utils/dropStack'

type TagType = 'success' | 'danger' | 'info'

const dropFile = ref<File | null>(null)
const stackFile = ref<File | null>(null)
const dropSummary = ref<DropStackSummary | null>(null)
const stackSummary = ref<DropStackSummary | null>(null)
const loadingDrop = ref(false)
const loadingStack = ref(false)

const rows = computed(() =>
  buildDropStackRows(dropSummary.value, stackSummary.value)
)
const mismatches = computed(() =>
  rows.value.filter((row) => row.ok === false)
)
const bothParsed = computed(
  () => !!dropSummary.value && !!stackSummary.value
)
const hasAnyComparedValue = computed(() =>
  rows.value.some(
    (row) => row.compare && row.drop !== '—' && row.stack !== '—'
  )
)

async function parseDrop(file: File) {
  dropSummary.value = null
  loadingDrop.value = true
  try {
    dropSummary.value = await parseDropStackReport(file)
  } catch (error) {
    ElMessage.error(`跌落报告解析失败：${String(error)}`)
  } finally {
    loadingDrop.value = false
  }
}

async function parseStack(file: File) {
  stackSummary.value = null
  loadingStack.value = true
  try {
    stackSummary.value = await parseDropStackReport(file)
  } catch (error) {
    ElMessage.error(`堆码报告解析失败：${String(error)}`)
  } finally {
    loadingStack.value = false
  }
}

function handleDropFile(file: File) {
  if (loadingDrop.value) return
  dropFile.value = file
  parseDrop(file)
}

function handleStackFile(file: File) {
  if (loadingStack.value) return
  stackFile.value = file
  parseStack(file)
}

function handleDropModelUpdate(file: File | null) {
  dropFile.value = file
  if (!file) dropSummary.value = null
}

function handleStackModelUpdate(file: File | null) {
  stackFile.value = file
  if (!file) stackSummary.value = null
}

function rowClassName({ row }: { row: DropStackTableRow }) {
  return row.ok === false ? 'mismatch-row' : ''
}

function statusType(value: boolean | null): TagType {
  if (value === true) return 'success'
  if (value === false) return 'danger'
  return 'info'
}

function statusText(
  value: boolean | null,
  okText: string,
  failText: string
): string {
  if (value === true) return okText
  if (value === false) return failText
  return '未判断'
}

function reset() {
  dropFile.value = null
  stackFile.value = null
  dropSummary.value = null
  stackSummary.value = null
}
</script>

<template>
  <div class="drop-stack-page">
    <div class="page-header">
      <div>
        <h1>跌落 / 堆码报告比对</h1>
        <p>
          分别拖入 1.2m 跌落测试报告和 3m 堆码测试报告，自动提取并比对关键信息。
        </p>
      </div>
      <el-button
        :disabled="loadingDrop || loadingStack"
        @click="reset"
      >
        清空
      </el-button>
    </div>

    <div class="dropzones">
      <section class="dropzone-card">
        <div class="card-title">
          跌落报告
          <span v-if="loadingDrop" class="loading-text">解析中…</span>
        </div>
        <div class="dropzone-body">
          <SingleFileDropzone
            :model-value="dropFile"
            :disabled="loadingDrop"
            label="跌落报告"
            @update:model-value="handleDropModelUpdate"
            @file-selected="handleDropFile"
          />
        </div>
        <div v-if="dropSummary" class="report-status">
          <el-tag
            :type="statusType(dropSummary?.isReportNoCorrect ?? null)"
            size="small"
          >
            报告编号{{
              statusText(dropSummary?.isReportNoCorrect ?? null, '一致', '不一致')
            }}
          </el-tag>
          <el-tag
            :type="statusType(dropSummary?.isDateCorrect ?? null)"
            size="small"
          >
            日期{{
              statusText(dropSummary?.isDateCorrect ?? null, '合法', '存在非法日期')
            }}
          </el-tag>
        </div>
      </section>

      <section class="dropzone-card">
        <div class="card-title">
          堆码报告
          <span v-if="loadingStack" class="loading-text">解析中…</span>
        </div>
        <div class="dropzone-body">
          <SingleFileDropzone
            :model-value="stackFile"
            :disabled="loadingStack"
            label="堆码报告"
            @update:model-value="handleStackModelUpdate"
            @file-selected="handleStackFile"
          />
        </div>
        <div v-if="stackSummary" class="report-status">
          <el-tag
            :type="statusType(stackSummary?.isReportNoCorrect ?? null)"
            size="small"
          >
            报告编号{{
              statusText(stackSummary?.isReportNoCorrect ?? null, '一致', '不一致')
            }}
          </el-tag>
          <el-tag
            :type="statusType(stackSummary?.isDateCorrect ?? null)"
            size="small"
          >
            日期{{
              statusText(stackSummary?.isDateCorrect ?? null, '合法', '存在非法日期')
            }}
          </el-tag>
        </div>
      </section>
    </div>

    <el-alert
      v-if="bothParsed && !hasAnyComparedValue"
      type="warning"
      :closable="false"
      show-icon
      title="两份报告都没有提取到可比对的有效字段，请检查文件内容"
    />
    <el-alert
      v-else-if="bothParsed && mismatches.length === 0"
      type="success"
      :closable="false"
      show-icon
      title="两份报告的关键信息一致"
    />
    <el-alert
      v-else-if="bothParsed"
      type="warning"
      :closable="false"
      show-icon
      :title="`发现 ${mismatches.length} 处不一致`"
    />
    <el-alert
      v-else-if="dropSummary || stackSummary"
      type="info"
      :closable="false"
      show-icon
      title="再拖入另一份报告即可自动比对"
    />

    <el-table
      v-if="dropSummary || stackSummary"
      :data="rows"
      :row-class-name="rowClassName"
      border
      class="compare-table"
      stripe
    >
      <el-table-column prop="label" label="字段" min-width="220" />
      <el-table-column label="跌落报告" min-width="180">
        <template #default="{ row }">{{ row.drop }}</template>
      </el-table-column>
      <el-table-column label="堆码报告" min-width="180">
        <template #default="{ row }">{{ row.stack }}</template>
      </el-table-column>
      <el-table-column align="center" label="结果" width="110">
        <template #default="{ row }">
          <el-tag v-if="!row.compare" type="info">仅堆码</el-tag>
          <el-tag v-else-if="row.ok === null" type="info">待解析</el-tag>
          <el-tag
            v-else-if="row.drop === '—' && row.stack === '—'"
            type="info"
          >
            均未提供
          </el-tag>
          <el-tag v-else-if="row.ok === true" type="success">一致</el-tag>
          <el-tag v-else type="danger">不一致</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.drop-stack-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px;
  color: var(--color-text-strong);
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.dropzones {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.dropzone-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--color-background-mute);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--color-text-strong);
  font-size: 15px;
  font-weight: 600;
}

.loading-text {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 400;
}

.dropzone-body {
  position: relative;
}

.report-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.compare-table {
  margin-top: 20px;
}

:deep(.el-table) {
  --el-table-border-color: var(--color-border);
  --el-table-header-bg-color: var(--color-background-elevated);
  --el-table-header-text-color: var(--color-text-strong);
  --el-table-text-color: var(--color-text);
  --el-table-row-hover-bg-color: var(--color-background-elevated);
  --el-table-bg-color: var(--color-background);
  --el-table-tr-bg-color: var(--color-background);
  background-color: var(--color-background);
}

:deep(.el-table th) {
  background-color: var(--color-background-elevated);
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: var(--color-background-stripe);
}

:deep(.el-table--striped .el-table__body tr:not(.el-table__row--striped) td) {
  background-color: var(--color-background);
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: var(--color-background-elevated);
}

:deep(.el-table__empty-block) {
  background-color: var(--color-background);
}

:deep(.el-alert) {
  margin-bottom: 16px;
}

:deep(.mismatch-row td) {
  background-color: rgba(245, 108, 108, 0.12) !important;
}

@media (max-width: 800px) {
  .dropzones {
    grid-template-columns: 1fr;
  }
}
</style>

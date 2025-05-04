<script lang="ts" setup>
import { Delete } from '@element-plus/icons-vue'
import Pdf from '../assets/svg/Pdf.vue'
import Docx from '../assets/svg/Docx.vue'
import { FileItem } from '../types'
import { calculateColorBrightness } from '../utils/utils.ts'

const props = defineProps({
  additionLabel: {
    type: String,
    default: '',
  },
  emptyText: {
    type: String,
    default: '',
  },
})

const files = defineModel<FileItem[]>({
  required: true,
})

// 处理文件删除
const handleRemoveFile = (index: number) => {
  if (index === -1) {
    return
  } else {
    files.value.splice(index, 1)
  }
}

function rowStyle({ row }: { row: any; rowIndex: number }) {
  if (!row.bgColor) {
    return {}
  }
  return {
    color: calculateColorBrightness(row.bgColor),
    fontSize: '14px',
    backgroundColor: row.bgColor,
    padding: '4px',
  }
}
</script>

<template>
  <el-table
    :data="files"
    :row-style="rowStyle"
    size="small"
    :empty-text="props.emptyText"
    style="width: 100%"
  >
    <el-table-column label="文件名" min-width="180">
      <template #default="{ row }">
        <div class="file-name">
          <el-icon v-if="row.icon === 'word'">
            <Docx />
          </el-icon>
          <el-icon v-if="row.icon === 'pdf'">
            <Pdf />
          </el-icon>
          <span class="file-name-text">{{ row.file.name }}</span>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="大小" prop="size" width="100" />

    <el-table-column label="修改时间" prop="lastModified" width="180" />

    <el-table-column
      v-if="props.additionLabel"
      :label="props.additionLabel"
      prop="additionValue"
      width="180"
    />

    <el-table-column fixed="right" label="操作" width="80">
      <template #default="scope">
        <el-button
          :icon="Delete"
          circle
          size="small"
          type="danger"
          @click.stop="handleRemoveFile(scope.$index)"
        ></el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-table) {
  --el-table-border-color: #484848;
  --el-table-header-bg-color: #363636;
  background-color: #252529;
}

:deep(.el-table th) {
  background-color: #363636;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: #363636;
}
</style>

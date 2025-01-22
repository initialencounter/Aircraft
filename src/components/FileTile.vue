<script lang="ts" setup xmlns="http://www.w3.org/1999/html">
import { FileTileMap } from "../types/index";
import { calculateColorBrightness } from "../utils/utils";
import { ElMessage } from "element-plus";
import Clip from "../assets/svg/Clip.vue";
import { ipcManager } from "../utils/ipcManager";

const PATH_OR_LAST_MODIFIED = "路径";
const PATH_OR_LAST_MODIFIED_ATTR = "path";
const MD5_OR_BLAKE2 = "BLAKE2";
const NAME_WIDTH = 300;
const file_list = defineModel<FileTileMap>({ required: true });
const emit = defineEmits(["removeItem"]);

function removeItem(index: number) {
  if (index === -1) {
    console.log("Cannot remove the header");
    emit("removeItem");
    return;
  } else {
    file_list.value.splice(index, 1);
  }
}

async function copyText(textToCopy: string) {
  try {
    await navigator.clipboard.writeText(textToCopy);
    ElMessage.success({
      message: "已复制到剪贴板",
      type: "success",
    });
  } catch (err) {
    ElMessage.error({
      message: "复制失败",
      type: "error",
    });
  }
}

function focusItem(index: number) {
  file_list.value[index].focus = !file_list.value[index].focus;
}

function handleHeaderClick(column: any) {
  if (column.label == "BLAKE2") {
    removeItem(-1);
  }
}

function rowStyle({ row }: { row: any; rowIndex: number }) {
  return {
    color: calculateColorBrightness(row.color),
    fontSize: "14px",
    backgroundColor: row.color,
    padding: "4px",
  };
}

function openDir(dirName: string) {
  ipcManager.invoke("open_local_dir", { target: dirName });
}

function open_with_wps(dirName: string, fileName: string) {
  ipcManager.invoke("open_with_wps", { target: dirName, name: fileName });
}
</script>

<template>
  <el-table
    :cell-style="{
      fontSize: '14px',
      padding: '1px',
      border: '1px solid #515151',
    }"
    :data="file_list"
    :header-cell-style="{
      color: '#333333',
      fontSize: '18px',
      fontWeight: 700,
      background: '#0091ea',
      border: '1px solid #515151',
    }"
    :row-style="rowStyle"
    class="tile-container"
    empty-text="拖拽文件到此处，颜色相同则表示文件一致！"
    style="width: 100%; z-index: 1000"
    border
    @header-click="handleHeaderClick"
  >
    <el-table-column :width="NAME_WIDTH" label="名称">
      <template #default="scope">
        <div
          :style="{ opacity: scope.row.focus ? '0.4' : '1' }"
          class="tile-text"
        >
          <div
            class="tile-name"
            @click="focusItem(scope.$index)"
            @dblclick="open_with_wps(scope.row.path, scope.row.name)"
          >
            {{ scope.row.name ?? "&#45;&#45;" }}
          </div>
          <div class="tile-copy" @click="copyText(scope.row.name)">
            <Clip />
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column :label="PATH_OR_LAST_MODIFIED">
      <template #default="scope">
        <div
          :style="{ opacity: scope.row.focus ? '0.4' : '1' }"
          class="tile-text"
          @dblclick="openDir(scope.row.path)"
        >
          <div class="filePath" @click="focusItem(scope.$index)">
            {{ scope.row[PATH_OR_LAST_MODIFIED_ATTR] ?? "--" }}
          </div>
          <div class="tile-copy" @click="copyText(scope.row.path)">
            <Clip />
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column :label="MD5_OR_BLAKE2" width="160">
      <template #default="scope">
        <div>
          <div
            class="tile-text tile-md5"
            :style="{ opacity: scope.row.focus ? '0.4' : '1' }"
            @click="removeItem(scope.$index)"
          >
            {{ scope.row.md5.slice(0, 16) ?? "--" }}
          </div>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.tile-container {
  background: transparent;
  position: relative;
  list-style-type: none;
  text-align: left;
  border-radius: 4px;
}

.tile-text {
  position: relative;
  float: left;
  line-height: 2rem;
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.tile-name {
  width: 100%;
  height: 100%;
  border-radius: 3px;
}

.tile-copy {
  position: absolute;
  right: 0;
  top: 2px;
}

.tile-copy:hover {
  cursor: pointer;
  color: #3c91f8;
}

.filePath {
  float: left;
  height: 100%;
}

.tile-md5 {
  width: 100%;
  height: 100%;
}

.tile-md5:hover {
  cursor: pointer;
}
</style>

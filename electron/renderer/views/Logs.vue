<template>
  <div class="scroller" ref="scrollerRef">
    <div v-for="item in visibleLogs">
      <div class="log-item">
        <span class="log-timestamp">[{{ item.time_stamp }}]</span>
        <span
          class="log-level"
          :class="{
            'level-info': item.level === 'INFO',
            'level-error': item.level === 'ERROR',
            'level-warn': item.level === 'WARN',
          }"
          >{{ item.level }}</span
        >
        <span class="log-message">{{ item.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useLogStore, type LogStore } from '../stores/logs';

const BUFFER_SIZE = 1000; // 一次显示的日志数量
const scrollerRef = ref<HTMLElement | null>(null);
const visibleLogs = computed(() => {
  return [...logStore.logHistory].reverse().slice(0, BUFFER_SIZE);
});

const logStore: LogStore = useLogStore();
onMounted(() => {
  logStore.startGetLog();
});
onBeforeUnmount(() => {
  logStore.stopGetLog();
});
</script>

<style scoped>
.scroller {
  height: 100vh;
  overflow-y: auto;
  padding: 12px;
  background: #1e1e1e;
}

.log-item {
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 4px 0;
  display: grid;
  grid-template-columns: 175px 80px 1fr;
  gap: 12px;
  align-items: center;
}

.log-timestamp {
  color: #808080;
  font-weight: 500;
}

.log-level {
  padding: 2px 4px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  font-size: 0.9em;
}

.level-info {
  background: rgba(0, 255, 0, 0.1);
  color: #4caf50;
}

.level-error {
  background: rgba(255, 0, 0, 0.1);
  color: #f44336;
}

.level-warn {
  background: rgba(255, 255, 0, 0.1);
  color: #ffeb3b;
}

.log-message {
  color: #d0d7de;
  word-break: break-all;
}
</style>

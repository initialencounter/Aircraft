<template>
  <div class="home">
    <h1>首页</h1>
    <div v-if="authStore.loginStatus">
      <el-result icon="success" title="登录成功"></el-result>
    </div>
    <div v-else>
      <el-result icon="error" title="登录失败"></el-result>
    </div>
    <div v-if="listenStore.isListening">
      <el-result icon="success" title="快捷键监听中"></el-result>
    </div>
    <div v-else>
      <el-result icon="error" title="快捷键监听未开启"></el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { useAuthStore, type AuthStore } from "../stores/auth";
import { useListenStore, type ListenStore } from "../stores/isListen";

const authStore: AuthStore = useAuthStore();
const listenStore: ListenStore = useListenStore();

onMounted(() => {
  authStore.startPolling();
  listenStore.startPolling();
});

onBeforeUnmount(() => {
  authStore.stopPolling();
  listenStore.stopPolling();
});
</script>

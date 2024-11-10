<template>
  <div class="home">
    <h1>首页</h1>
    <div v-if="authStore.loginStatus">
      <el-result
        icon="success"
        title="登录成功"
      ></el-result>
    </div>
    <div v-else>
      <el-result
        icon="error"
        title="登录失败"
      ></el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore, type AuthStore } from '../stores/auth'

const authStore: AuthStore = useAuthStore()

onMounted(() => {
  authStore.startPolling()
})

onBeforeUnmount(() => {
  authStore.stopPolling()
})

</script> 
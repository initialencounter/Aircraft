<script lang="ts" setup>
import TitleBar from "./components/TitleBar.vue";
import {invoke, isTauri} from '@tauri-apps/api/core';
import {Event, listen} from '@tauri-apps/api/event';
import {ElMessage} from "element-plus";

interface Link {
  link: string;
}

if (isTauri()) {
  listen('open_link', (data: Event<Link>): void => {
    window.open(data.payload.link)
  })
}

// 使用 async/await
async function checkLoginStatus() {
  const isLoggedIn = await invoke('get_login_status')
  ElMessage.success(isLoggedIn ? "登录成功" : "登录失败")
}
</script>

<template>
  <TitleBar avatar="https://avatars.githubusercontent.com/u/109729945"
            link="https://github.com/initialencounter/aircraft"></TitleBar>
  <body>
  <br>
  <br>
  <el-button @click="checkLoginStatus"></el-button>
  </body>
</template>

<style scoped>
@import url('./assets/css/app.css');
</style>
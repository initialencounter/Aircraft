<script lang="ts" setup>
import TitleBar from "./components/TitleBar.vue";
import {isTauri} from '@tauri-apps/api/core';
import {Event, listen} from '@tauri-apps/api/event';
import SideBar from "./components/SideBar.vue";

interface Link {
  link: string;
}

if (isTauri()) {
  listen('open_link', (data: Event<Link>): void => {
    window.open(data.payload.link)
  })
}

</script>

<template>
  <div class="main-container">
    <TitleBar avatar="https://avatars.githubusercontent.com/u/109729945"
    link="https://github.com/initialencounter/aircraft"></TitleBar>
    <SideBar />
    <div class="content">
      <keep-alive>
        <router-view></router-view>
      </keep-alive>
    </div>
  </div>
</template>

<style scoped>
@import url('./assets/css/app.css');

.main-container {
  border-radius: 5%;
  display: flex;
  height: calc(100vh - 60px); /* 减去标题栏高度 */
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  margin-left: 8rem;  /* 添加左边距，与侧边栏宽度相同 */
}
</style>
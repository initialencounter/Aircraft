<script setup lang="ts">
import TitleBar from "./components/TitleBar.vue";
import {isTauri} from '@tauri-apps/api/core';
import {listen, Event} from '@tauri-apps/api/event';

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
  <TitleBar link="https://github.com/initialencounter/aircraft"
            avatar="https://avatars.githubusercontent.com/u/109729945"></TitleBar>
</template>

<style scoped>
@import url('./assets/css/app.css');
</style>
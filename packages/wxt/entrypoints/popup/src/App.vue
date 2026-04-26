<template>
  <main class="popup-shell">
    <p class="popup-eyebrow">Quick Access</p>
    <h1>调试入口</h1>
    <p class="popup-copy">从 popup 直接打开测试页或配置页。</p>

    <el-button
      type="primary"
      size="large"
      :disabled="!enableTestPage"
      @click="openPage('model-debug.html')"
    >
      打开测试页
    </el-button>
    <el-button size="large" @click="openOptionsPage">打开配置页</el-button>

    <el-alert
      v-if="!enableTestPage"
      title="当前构建未包含测试页。可在构建前设置 WXT_BUILD_TEST_PAGE=true。"
      type="warning"
      :closable="false"
      show-icon
    />
  </main>
</template>

<script setup lang="ts">
const enableTestPage = __ENABLE_TEST_PAGE__

async function openPage(path: string) {
  await chrome.tabs.create({
    url: chrome.runtime.getURL(path),
  })
  window.close()
}

async function openOptionsPage() {
  if (chrome.runtime.openOptionsPage) {
    await chrome.runtime.openOptionsPage()
  } else {
    await openPage('options.html')
  }
  window.close()
}
</script>

<style scoped>
.popup-shell {
  width: 320px;
  display: grid;
  gap: 14px;
}

.popup-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8db38e;
}

h1 {
  margin: 0;
  font-size: 26px;
}

.popup-copy {
  margin: 0;
  color: #c3d0dc;
}
</style>
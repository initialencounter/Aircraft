import path from 'path'

import { defineConfig } from 'vite'
// @ts-ignore
import vue from '@vitejs/plugin-vue'
import yaml from '@maikolib/vite-plugin-yaml'

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue(), yaml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      types: path.resolve(__dirname, './types'),
    },
  },
  optimizeDeps: {
    include: [
      'cordis',
      'schemastery-vue',
      'element-plus',
      'vue-i18n',
      'markdown-vue',
      'pinia',
      'vue-router',
      'schemastery',
      '@tauri-apps/api/core',
      '@tauri-apps/api/event',
      'spark-md5',
      '@element-plus/icons-vue',
    ],
  },

  build: {
    rollupOptions: {
      input: path.join(__dirname, 'index.html'),
      onwarn(warning, warn) {
        // 忽略 eval 相关警告
        if (
          warning.code === 'EVAL' &&
          (warning.id?.includes('file-type/core.js') ||
            warning.id?.includes('depd/index.js'))
        ) {
          return
        }
        warn(warning)
      },
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    proxy: {
      // 代理特定的 API 端点到后端服务器，避免 CORS 问题
      '^/(save-config|get-config|reload-config|upload|upload-selected|get-project-info|get-attachment-info|upload-llm-files|ping|get-captcha|login|reload-clipkeeper-config|set-clipboard-text|search-file)': {
        target: 'http://127.0.0.1:25455',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: [
        '**/.vscode/**',
        '**/bindings/**',
        '**/dist/**',
        '**/dist-electron/**',
        '**/elctron/**',
        '**/headless/**',
        '**/logs/**',
        '**/node_modules/**',
        '**/pdf-parser/**',
        '**/release/**',
        '**/share/**',
        '**/src-tauri/**',
        '**/target/**',
        '**/summary-rs/**',
      ],
    },
  },
}))

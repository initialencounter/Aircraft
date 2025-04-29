import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import yaml from "@maikolib/vite-plugin-yaml";
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue(), yaml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'types': path.resolve(__dirname, './types')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  optimizeDeps: {
    include: [
      'cordis', 
      'electron-store', 
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
      '@element-plus/icons-vue'
    ], // 预构建关键依赖
    esbuildOptions: {
      target: 'esnext', // 使用更现代的目标
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
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: [
        "**/.yarn/**",
        "**/.vscode/*",
        "**/bindings/**",
        "**/dist/**",
        "**/dist-electron/**",
        "**/elctron/**",
        "**/headless/**",
        "**/logs**",
        "**/node_modules/**",
        "**/pdf-parser/**",
        "**/release/**",
        "**/share/**",
        "**/src-tauri/**",
        "**/target/**",
        "**/summary-rs/**",
      ],
    },
  },
}));

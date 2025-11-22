import { defineConfig } from 'wxt'
import yaml from '@maikolib/vite-plugin-yaml'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    build: {
      minify: false,
      rollupOptions: {
        output: {
          // 将所有依赖打包到一起
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
    },
    plugins: [yaml()],
    optimizeDeps: {
      // 确保这些依赖被预构建
      include: ['onnxruntime-web'],
    },
  }),
  modules: ['@wxt-dev/module-vue'],
  entrypointsDir: './entrypoints',
  manifest: {
    name: 'lims',
    version: '2.2.0',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    web_accessible_resources: [
      {
        resources: [
          'loading.gif',
          'easyui-interceptor.js',

          // ONNX 模型相关文件
          'segment.onnx',
          'model.js',
          'ort-wasm-simd-threaded.wasm',
          'ort-wasm-simd-threaded.jsep.wasm',
          'ort-wasm-simd-threaded.asyncify.wasm',
        ],
        matches: ['<all_urls>'],
      }
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    },
    browser_specific_settings: {
      gecko: {
        id: '{3f8b9a12-a64d-48d8-bb5c-8d9f4e9322b2}',
      },
    },
    icons: {
      '48': 'icon/lims.png',
    },
    permissions: [
      'activeTab',
      'clipboardWrite',
      'scripting',
      'storage',
      'contextMenus',
      'offscreen',
    ],
    host_permissions: ['<all_urls>'],
    options_page: 'options.html',
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      // 删除自动生成的 options_ui 字段
      delete manifest.options_ui;
    },
  },
})

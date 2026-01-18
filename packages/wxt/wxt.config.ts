import { defineConfig } from 'wxt'
import yaml from '@maikolib/vite-plugin-yaml'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  // @ts-expect-error - Vite version mismatch between WXT and local
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
    version: '3.1.5',
    description: 'Automates form validation and data entry for battery inspection forms.',
    web_accessible_resources: [
      {
        resources: [
          'loading.gif',
          'easyui-interceptor.js',

          // ONNX 模型相关文件
          'segment.onnx',
          'ort-wasm-simd-threaded.wasm',

          // WASM 相关文件
          'aircraft.js',
          'aircraft_bg.wasm',
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
        update_url: 'https://lims.initenc.cn/updates.json'
      },
    },
    icons: {
      '48': 'icon/lims.png',
    },
    permissions: [
      'clipboardWrite',
      'storage',
    ],
    host_permissions: ['<all_urls>'],
    options_page: 'options.html',
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // 删除自动生成的 options_ui 字段
      delete manifest.options_ui;
    },
  },
})

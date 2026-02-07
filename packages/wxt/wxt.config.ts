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
          // 移除 inlineDynamicImports，因为有多个入口点
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
          'best.onnx',

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
      const webAccessibleResources = manifest.web_accessible_resources as Array<{
        resources: string[];
        matches: string[];
      }>;

      if (webAccessibleResources && webAccessibleResources.length > 0) {
        if (wxt.config.browser === 'chrome') {
          webAccessibleResources[0].resources.push('ort-wasm-simd-threaded.asyncify.wasm');
          webAccessibleResources[0].resources.push('offscreen.html');
        } else {
          webAccessibleResources[0].resources.push('ort-wasm-simd-threaded.wasm');
        }
      }
    },
    'build:publicAssets': (wxt, files) => {
      const excludeFile = wxt.config.browser === 'chrome'
        ? 'ort-wasm-simd-threaded.wasm'
        : 'ort-wasm-simd-threaded.asyncify.wasm';

      // 从文件列表中移除不需要的文件
      const indexToRemove = files.findIndex(file =>
        'absoluteSrc' in file && file.absoluteSrc.endsWith(excludeFile)
      );

      if (indexToRemove !== -1) {
        files.splice(indexToRemove, 1);
        console.log(`Excluded: ${excludeFile} (not needed for ${wxt.config.browser})`);
      }
    },
  },
})

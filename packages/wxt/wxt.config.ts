import { defineConfig } from 'wxt'
import { build } from 'vite'
import yaml from '@maikolib/vite-plugin-yaml'
import { fileURLToPath } from 'url'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    build: {
      emptyOutDir: true,
      minify: true,
      chunkSizeWarningLimit: 5 * 10 ** 7,
    },
    plugins: [yaml()],
  }),
  modules: ['@wxt-dev/module-vue'],
  entrypointsDir: './entrypoints',
  manifest: {
    name: 'lims',
    version: '3.6.0',
    description: 'Automates form validation and data entry for battery inspection forms.',
    web_accessible_resources: [
      {
        resources: [
          'loading.gif',
          'easyui-interceptor.js',
          'xhr-interceptor.js',
          'jquery-interceptor.js',

          // ONNX 模型相关文件
          'segment.onnx',

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
      'offscreen',
    ],
    host_permissions: ['<all_urls>'],
    options_page: 'options.html',
    background: {
      scripts: ['background.js'], // Add background.js as a background script
    },
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (!manifest) {
        console.error("Manifest generation failed: manifest is undefined");
        return;
      }
      // 删除自动生成的 options_ui 字段
      delete manifest.options_ui;
      const webAccessibleResources = manifest.web_accessible_resources as Array<{
        resources: string[];
        matches: string[];
      }>;

      if (webAccessibleResources && webAccessibleResources.length > 0) {
        if (wxt.config.browser === 'chrome') {
          webAccessibleResources[0].resources.push('offscreen.html');
          webAccessibleResources[0].resources.push('model.js');
          webAccessibleResources[0].resources.push('ort-wasm-simd-threaded.asyncify.wasm')
          manifest["background"] = {
            "service_worker": "background.js",
          }
        } else {
          webAccessibleResources[0].resources.push('ort-wasm-simd-threaded.wasm')
          manifest["background"] = {
            "scripts": ["background.js"],
          }
        }
      }
    },
    'entrypoints:resolved': (wxt, entrypoints) => {
      // Firefox 构建时移除 model.ts 入口点
      if (wxt.config.browser === 'firefox') {
        const modelIndex = entrypoints.findIndex((entry: any) =>
          entry.inputPath && entry.inputPath.includes('model.ts')
        );
        if (modelIndex !== -1) {
          entrypoints.splice(modelIndex, 1);
          console.log('Excluded model.ts entrypoint for Firefox build');
        }
      }
    },
    'build:publicAssets': (_wxt, files) => {
      const excludeFiles = ['aircraft_bg.wasm.d.ts', 'aircraft.d.ts'];
      excludeFiles.forEach(dtsFile => {
        const dtsIndexToRemove = files.findIndex(file =>
          'absoluteSrc' in file && file.absoluteSrc.endsWith(dtsFile)
        );
        if (dtsIndexToRemove !== -1) {
          files.splice(dtsIndexToRemove, 1);
          console.log(`Excluded: ${dtsFile}`);
        }
      });
    },
    'build:before': async (wxt) => {
      const isFirefox = wxt.config.browser === 'firefox';
      // Background 构建
      // Chrome 用 offscreen 推理，background.ts 中的 ort 调用不会执行，用 stub 替换以避免打包整个 onnxruntime-web
      // Firefox 需要在 background 中直接运行推理，因此正常打包 onnxruntime-web
      build({
        resolve: isFirefox ? {} : {
          alias: {
            'onnxruntime-web/wasm': fileURLToPath(new URL('./scripts/ort-stub.js', import.meta.url)),
            'onnxruntime-web/webgpu': fileURLToPath(new URL('./scripts/ort-stub.js', import.meta.url)),
            'onnxruntime-web': fileURLToPath(new URL('./scripts/ort-stub.js', import.meta.url)),
          },
        },
        build: {
          minify: true,
          emptyOutDir: false,
          rolldownOptions: {
            input: {
              'background': fileURLToPath(new URL('./background.ts', import.meta.url)),
            },
            output: {
              dir: wxt.config.outDir,
              manualChunks: undefined,
              entryFileNames: '[name].js',
              chunkFileNames: '[name].js',
              assetFileNames: '[name].[ext]',
              format: 'cjs',
              codeSplitting: false, // 将所有内容打包成单个 bundle
            },
          },
        },
      });

      // Offscreen 构建, Firefox 不支持 offscreen
      if (isFirefox) {
        return;
      }

      build({
        build: {
          // minify: true,
          emptyOutDir: false,
          rolldownOptions: {
            input: {
              'model': fileURLToPath(new URL('./offscreen.html', import.meta.url)),
            },
            output: {
              dir: wxt.config.outDir,
              manualChunks: undefined,
              entryFileNames: '[name].js',
              chunkFileNames: '[name].js',
              assetFileNames: '[name].[ext]',
            },
          },
        },
      });
    }
  },
})

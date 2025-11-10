import { defineConfig } from 'wxt'
import yaml from '@maikolib/vite-plugin-yaml'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    build: {
      minify: false,
    },
    plugins: [yaml()],
  }),
  modules: ['@wxt-dev/module-vue'],
  entrypointsDir: './entrypoints',
  manifest: {
    name: 'lims',
    version: '2.1.7',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    web_accessible_resources: [
      {
        resources: ['loading.gif', 'easyui-interceptor.js'],
        matches: ['<all_urls>'],
      }
    ],
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

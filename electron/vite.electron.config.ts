import fs from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import yaml from '@maikolib/vite-plugin-yaml'

import pkg from '../package.json'
// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG
  const mainEntry = 'main/index.ts'
  const preloadEntry = 'preload/index.ts'
  const root = __dirname
  return {
    root,
    plugins: [
      vue(),
      yaml(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: mainEntry,
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log(
                /* For `.vscode/.debug.script.mjs` */ '[startup] Electron App'
              )
            } else {
              startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                external: Object.keys(
                  'dependencies' in pkg ? pkg.dependencies : {}
                ),
                onwarn(warning, warn) {
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
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: preloadEntry,
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys(
                  'dependencies' in pkg ? pkg.dependencies : {}
                ),
                onwarn(warning, warn) {
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
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
    ],
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
        '@element-plus/icons-vue',
      ],
    },
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL('http://localhost:5173/')
        return {
          host: url.hostname,
          port: +url.port,
        }
      })(),
    clearScreen: false,
  }
})

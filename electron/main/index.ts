import { app, BrowserWindow, shell, ipcMain, Tray, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { webHookStart } from '../task/index'
import { BaseConfig, LogMessage } from '../types'
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let tray: Tray | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Aircraft',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

function createTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, 'favicon.ico'))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Aircraft')
  tray.setContextMenu(contextMenu)

  // 修改点击托盘图标的逻辑
  tray.on('click', () => {
    if (win?.isVisible()) {
      win?.hide()
    } else {
      win?.show()
    }
  })
}

app.whenReady().then(async () => {
  await webHookStart(__dirname);
  createWindow();
  createTray();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tray?.destroy()
    tray = null
    win = null
    app.quit()
  }
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// 添加在其他 ipcMain 处理程序附近
ipcMain.handle('set-window-draggable', (_, isDraggable: boolean) => {
  win?.setMovable(isDraggable);
});

ipcMain.handle('window-minimize', () => {
  win?.minimize();
  console.log('window-minimize');
});

ipcMain.handle('window-hide', () => {
  win?.hide();
  console.log('window-hide');
});

ipcMain.handle('window-show', () => {
  win?.show();
  console.log('window-show');
});


// 修改用于开机自启的 ipcMain 处理程序
ipcMain.handle('save_base_config', async (_, config: BaseConfig) => {
  const AutoLaunch = require('auto-launch');
  
  const appLauncher = new AutoLaunch({
    name: app.getName(),
    path: process.env.VITE_DEV_SERVER_URL 
      ? process.execPath // 开发模式使用 electron 可执行文件路径
      : app.getPath('exe') // 生产模式使用打包后的应用路径
  });

  try {
    if (config.auto_start) {
      if (process.env.VITE_DEV_SERVER_URL) {
        console.log('In development mode, the startup function may not work normally');
        return;
      }
      await appLauncher.enable();
      console.log('Startup function enabled');
    } else {
      await appLauncher.disable();
      console.log('Startup function disabled');
    }
  } catch (error) {
    console.error('Error setting startup function: ' + error.message);
  }
});

ipcMain.handle('get_base_config', async () => {
  return {
    auto_start: false,
    silent_start: false,
    nothing: "",
  };
});

ipcMain.handle('get_server_config', async () => {
  return {
    base_url: "",
    username: " ",
    password: "",
    port: 25455,
    debug: true,
    log_enabled: false,
  };
});

ipcMain.handle('get_server_logs', async () => {
  return [];
});

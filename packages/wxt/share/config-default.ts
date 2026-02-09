import { Config } from "../entrypoints/options/src/components/Schema"

// 这个文件由 scripts/generate-config-default.ts 自动生成
// 请勿手动编辑！运行 `npm run gen:config` 来更新此文件
export const defaultConfig: Config = {
  "hundredRowsResult": true,
  "allInWebBrowser": true,
  "onekeyAssign": true,
  "assignExperiment": true,
  "checkAssignUser": true,
  "showInspectFormLink": true,
  "enableDisplayEntrustEName": true,
  "enableSetEntrust": true,
  "screenshotItemName": false,
  "category": 1,
  "moonPay": true,
  "amount": "500.00",
  "tagNextYear": false,
  "openInNewTab": false,
  "onekeyRollback": true,
  "freshHotkey": true,
  "autoRefreshDuration": 10000,
  "verify": true,
  "warmUp": true,
  "dangerousModels": [
    "27100118P",
    "28100118",
    "624475ART",
    "506795",
    "INR18650-1.5Ah",
    "P13001L",
    "2998125",
    "BL-18EI"
  ],
  "dangerousModelsWithFactory": [
    {
      "model": "18650",
      "factory": "东莞倍创利电子科技有限公司"
    }
  ],
  "aircraftServer": "http://127.0.0.1:25455",
  "enableCheckAttachment": true,
  "enableLabelCheck": false,
  "enableLabelCheckManual": false,
  "manualCheckStackEvaluation": false,
  "autoCheckStackEvaluation": false,
  "verifyButtonOnMiddle": false,
  "enableCopyProjectNoByClick": true,
  "enableCopyProjectNoByCtrlDouble": true,
  "enableCopyProjectName": true,
  "enablePreventCloseBeforeSave": true,
  "markColorChangedInput": false,
  "changedInputBackgroundColor": "#76EEC6",
  "enableSaveHotKey": true,
  "enableImportHotKey": true,
  "dataCompare": false,
  "customIcon": false,
  "pekProjectNoColor": "#51a020",
  "sekProjectNoColor": "#3e8ed0",
  "aekProjectNoColor": "#8c1af6",
  "rekProjectNoColor": "#ea3323",
  "enableSetImportProjectNo": true,
  "enableSetImportClassification": true,
  "autoProjectNoPreset": false,
  "pekProjectNoPreset": "PEKGZ2024",
  "sekProjectNoPreset": "SEKGZ2024",
  "aekProjectNoPreset": "AEKGZ2024",
  "rekProjectNoPreset": "REKGZ2024",
  "enableSetQueryProjectNo": false,
  "nextYearColor": "",
  "nextYearBgColor": "#76EEC6"
}

// 导出配置键列表
export const configKeys = Object.keys(defaultConfig) as Array<keyof Config>

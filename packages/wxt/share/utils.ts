import { Config } from "entrypoints/options/src/components/Schema"

const LocalConfig: Config = {
  pekProjectNoColor: '#51a020',
  sekProjectNoColor: '#3e8ed0',
  aekProjectNoColor: '#8c1af6',
  rekProjectNoColor: '#ea3323',
  openInNewTab: true,
  dangerousModels: [
    '27100118P',
    '28100118',
    '624475ART',
    '506795',
    'INR18650-1.5Ah',
    'P13001L',
    '2998125',
    'BL-18EI',
  ],
  dangerousModelsWithFactory: [{ model: '18650', factory: '东莞倍创利电子科技有限公司' }],
  customIcon: false,
  enableSetEntrust: true,
  enableCopyProjectNo: true,
  enableCopyProjectName: true,
  enablePreventCloseBeforeSave: true,
  enableSaveHotKey: true,
  enableImportHotKey: true,
  enableSetImportProjectNo: true,
  autoProjectNoPreset: false,
  pekProjectNoPreset: 'PEKGZ2024',
  sekProjectNoPreset: 'SEKGZ2024',
  aekProjectNoPreset: 'AEKGZ2024',
  rekProjectNoPreset: 'REKGZ2024',
  enableSetQueryProjectNo: false,
  enableSetImportClassification: true,
  verify: true,
  category: 1,
  moonPay: true,
  amount: '500.00',
  tagNextYear: true,
  verifyButtonOnMiddle: false,
  aircraftServer: 'http://127.0.0.1:25455',
  enableCheckAttachment: true,
  enableLabelCheck: false,
  enableLabelCheckManual: false,
}

export const configKeys: Array<keyof typeof LocalConfig> = [
  'pekProjectNoColor',
  'sekProjectNoColor',
  'aekProjectNoColor',
  'rekProjectNoColor',
  'openInNewTab',
  'dangerousModels',
  'dangerousModelsWithFactory',
  'customIcon',
  'enableSetEntrust',
  'enableCopyProjectNo',
  'enableCopyProjectName',
  'enablePreventCloseBeforeSave',
  'enableSaveHotKey',
  'enableImportHotKey',
  'enableSetImportProjectNo',
  'autoProjectNoPreset',
  'pekProjectNoPreset',
  'sekProjectNoPreset',
  'aekProjectNoPreset',
  'rekProjectNoPreset',
  'enableSetQueryProjectNo',
  'enableSetImportClassification',
  'verify',
  'category',
  'moonPay',
  'amount',
  'tagNextYear',
  'verifyButtonOnMiddle',
  'aircraftServer',
  'enableCheckAttachment',
  'enableLabelCheck',
  'enableLabelCheckManual',
]


function checkDate(dateText: string[]) {
  for (const text of dateText) {
    if (!text) return false
    const [year, month, day] = text.split('-')
    if (year.length < 4 || Number(year) < 2020) {
      return false
    }
    if (isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) {
      return false
    }
    if (isNaN(Number(day)) || Number(day) < 1 || Number(day) > 31) {
      return false
    }
  }

  return dateText
}

function parseDate(dateText: string) {
  dateText = dateText.replace(/[^0-9]/g, '')
  if (dateText.length < 9) {
    return ['', '']
  }
  const year = dateText.slice(0, 4)
  const month = dateText.slice(4, 6)
  const day = dateText.slice(6, 8)
  if (month.length < 2) {
    return [`${year}-01-01`, `${year}-12-31`]
  }
  if (day.length < 2) {
    return [`${year}-${month}-01`, `${year}-${month}-31`]
  }
  return [`${year}-${month}-${day}`, `${year}-${month}-${day}`]
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function setProjectNoToClipText() {
  const projectNoSpan = document.getElementById('projectNo')
  const projectNo = projectNoSpan?.innerText // Add null check here
  navigator.clipboard.writeText(projectNo ?? '')
}

async function getClipboardText() {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}

function getMonthsAgoProjectNo() {
  const currentDate = new Date()
  currentDate.setMonth(currentDate.getMonth() - 1)
  return getSystemId() + currentDate.toISOString().slice(0, 7).replace('-', '')
}

async function getLocalConfig() {
  chrome.storage.local.get(configKeys, function (data) {
    for (const key of Object.keys(data) as Array<keyof typeof LocalConfig>) {
      // @ts-ignore
      LocalConfig[key] = data[key]
    }
  })
  await sleep(100)
  return LocalConfig
}

function getCategory() {
  return new URLSearchParams(window.location.search).get('category')
}

function getSystemId() {
  return window.location.pathname.startsWith('/pek')
    ? 'PEKGZ'
    : window.location.pathname.startsWith('/aek')
      ? 'AEKGZ'
      : window.location.pathname.startsWith('/rek')
        ? 'REKGZ'
        : 'SEKGZ'
}

function formatHexColor(color: string) {
  if (color.startsWith('#')) return color.slice(1)
}

export {
  LocalConfig, getLocalConfig, getCategory, getSystemId, checkDate, parseDate, sleep,
  setProjectNoToClipText, getClipboardText, getMonthsAgoProjectNo, formatHexColor
}

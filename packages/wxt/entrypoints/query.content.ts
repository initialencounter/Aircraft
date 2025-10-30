import {
  checkDate,
  getClipboardText,
  getLocalConfig,
  parseDate,
  sleep,
} from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/query/main'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  const localConfig = await getLocalConfig()
  await sleep(400)
  if (localConfig.enableSetQueryProjectNo === false) {
    console.log('未启用设置查询项目编号，退出脚本')
    return
  }
  console.log('检验单查询脚本运行中...')
  document.addEventListener('click', handleQueryBtnClick)
    // 物品种类
    ; (
      document.getElementsByClassName('textbox-value')[1] as HTMLInputElement
    ).value = 'battery'
  // 项目编号
  const projectNo_hide = document.getElementsByClassName(
    'textbox-value'
  )[2] as HTMLInputElement
  let lastInput = projectNo_hide.value
  while (projectNo_hide) {
    if (lastInput === projectNo_hide.value) {
      await sleep(50)
      continue
    }
    projectNo_hide.value = projectNo_hide.value.replace(/[^0-9A-Z]/g, '')
    lastInput = projectNo_hide.value
    const startDate = checkDate(parseDate(lastInput))
    // 检验日期
    if (!startDate) continue
      ; (
        document.getElementsByClassName('textbox-value')[14] as HTMLInputElement
      ).value = startDate[0]
      ; (
        document.getElementsByClassName('textbox-value')[15] as HTMLInputElement
      ).value = startDate[1]
  }

  async function handleQueryBtnClick() {
    const projectNo = await getClipboardText()
    let systemId = ''
    if (projectNo.indexOf('SEKGZ') !== -1) {
      systemId = 'sek'
    }
    if (projectNo.indexOf('PEKGZ') !== -1) {
      systemId = 'pek'
    }
    if (projectNo.indexOf('AEKGZ') !== -1) {
      systemId = 'aek'
    }
    if (projectNo.indexOf('REKGZ') !== -1) {
      systemId = 'rek'
    }
    ; (
      document.getElementsByClassName('textbox-value')[0] as HTMLInputElement
    ).value = systemId
      ; (
        document.getElementsByClassName('textbox-value')[2] as HTMLInputElement
      ).value = projectNo
    document.removeEventListener('click', handleQueryBtnClick)
  }
}

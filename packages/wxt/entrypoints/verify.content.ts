import type {
  AttachmentInfo,
  EntrustData,
  PekData,
  SekData,
  SummaryFromLLM,
  SummaryInfo,
} from '@aircraft/validators'
import {
  checkPekAttachment,
  checkPekBtyType,
  checkSekAttachment,
  checkSekBtyType,
  checkSummaryFromLLM,
  checkPekSodiumBtyType，
  checkSekSodiumBtyType，
  checkPekSodiumAttachment，
  checkSekSodiumAttachment，
} from '@aircraft/validators'
import '../assets/message.min.css'

// 工具函数和辅助方法
import { getCategory, getLocalConfig } from '../share/utils'
import {
  getCurrentProjectId,
  getCurrentProjectNo,
  getNotification,
  getSystemId,
  preventDefault,
  sleep,
} from './modules/utils/helpers'

// UI 相关
import {
  createVerifyButtons,
  updateVerifyButtonStatus,
} from './modules/ui/buttons'
import { createMask, hideMask, showMask } from './modules/ui/mask'
import { createLabelSelectionUI } from './modules/ui/labels'

// 验证相关
import { verifyFormData } from './modules/verify/data'

// 声明全局函数
declare global {
  function checkPekBtyType(
    data: PekData
  ): Array<{ ok: boolean; result: string }>

  function checkSekBtyType(
    data: SekData
  ): Array<{ ok: boolean; result: string }>

  function checkPekAttachment(
    data: PekData,
    attachmentInfo: AttachmentInfo,
    entrustData: EntrustData
  ): Array<{
    ok: boolean
    result: string
  }>

  function checkSekAttachment(
    data: SekData,
    attachmentInfo: AttachmentInfo,
    entrustData: EntrustData
  ): Array<{
    ok: boolean
    result: string
  }>

  function checkSummaryFromLLM(
    summaryFromLLM: SummaryFromLLM,
    summaryInfo: SummaryInfo
  ): Array<{
    ok: boolean
    result: string
  }>

  function checkPekSodiumBtyType(
    data: SekData
  ): Array<{ ok: boolean; result: string }>

  function checkPekSodiumAttachment(
    data: SekData,
    attachmentInfo: AttachmentInfo,
    entrustData: EntrustData
  ): Array<{
    ok: boolean
    result: string
  }>

  function checkSekSodiumBtyType(
    data: SekData
  ): Array<{ ok: boolean; result: string }>

  function checkSekSodiumAttachment(
    data: SekData,
    attachmentInfo: AttachmentInfo,
    entrustData: EntrustData
  ): Array<{
    ok: boolean
    result: string
  }>
}

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
    'https://*/pek/inspect*',
  ],
  allFrames: true,
  async main() {
    // 注册全局函数
    window.checkPekBtyType = checkPekBtyType
    window.checkSekBtyType = checkSekBtyType
    window.checkPekAttachment = checkPekAttachment
    window.checkSekAttachment = checkSekAttachment
    window.checkSummaryFromLLM = checkSummaryFromLLM

    window.checkPekSodiumBtyType = checkPekSodiumBtyType
    window.checkSekSodiumBtyType = checkSekSodiumBtyType
    window.checkPekSodiumAttachment = checkPekSodiumAttachment
    window.checkSekSodiumAttachment = checkSekSodiumAttachment

    // 读取本地配置
    const localConfig = await getLocalConfig()
    await sleep(200)

    // 获取系统信息
    const Qmsg = getNotification()
    const category = getCategory() ?? ''
    const systemId = getSystemId()

    // 如果不是电池类别或未启用验证，则退出
    if (!['battery', 'sodium'].includes(category)) return
    console.log('localConfig2', JSON.stringify(localConfig, null, 2))
    if (!localConfig.verify) {
      console.log('未启用验证，退出脚本')
      return
    }

    // 创建验证按钮
    createVerifyButtons(verifyHandler, localConfig)

    // 创建遮罩和标签检查UI
    createMask()
    createLabelSelectionUI(localConfig)

    const span = document.createElement('span')
    span.className = 'l-btn-text'
    span.innerHTML = '验证'
    const img = document.createElement('img')
    img.src = chrome.runtime.getURL('loading.gif')
    img.className = 'l-btn-icon'
    img.style.width = '16px'
    img.style.height = '16px'
    img.id = 'loadingImg'
    /**
     * 验证处理函数
     */
    async function verifyHandler() {
      const currentProjectId = getCurrentProjectId()
      if (currentProjectId === null) {
        Qmsg.warning('获取项目ID失败')
        return
      }

      const projectNo = getCurrentProjectNo()
      if (!projectNo) {
        Qmsg.warning('获取项目编号失败')
        return
      }
      const tempHtml = document.getElementById(
        'lims-verifyButton-icon'
      )!.innerHTML
      let result: Array<{
        ok: boolean
        result: string
      }> = []
      try {
        document.getElementById('lims-verifyButton-icon')!.innerHTML = ''
        document.getElementById('lims-verifyButton-icon')?.appendChild(span)
        document.getElementById('lims-verifyButton-icon')?.appendChild(img)
        // 执行验证
        result = await verifyFormData(
          category,
          systemId,
          currentProjectId,
          projectNo,
          localConfig
        )
      } catch (e) {
        console.error('验证处理出错:', e)
        Qmsg.error('验证处理出错，请稍后重试', { timeout: 3000 })
      } finally {
        document.getElementById('lims-verifyButton-icon')!.innerHTML = tempHtml
        if (!result.length) {
          updateVerifyButtonStatus('#54a124')
          Qmsg.success('初步验证通过', { timeout: 500 })
          return
        }

        updateVerifyButtonStatus('#fa5e55')
        Qmsg.warning('初步验证未通过' + JSON.stringify(result, null, 2), {
          showClose: true,
          timeout: 4000,
        })
      }
    }
  },
})

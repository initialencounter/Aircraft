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
import { handleFileDrop } from './modules/verify/llm'

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

    // 读取本地配置
    const localConfig = await getLocalConfig()
    await sleep(200)

    // 获取系统信息
    const Qmsg = getNotification()
    const category = getCategory()
    const systemId = getSystemId()

    // 如果不是电池类别或未启用验证，则退出
    if (category !== 'battery') return
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

    // 注册拖放事件处理
    document.ondragover = preventDefault
    document.ondragenter = preventDefault
    document.ondragleave = preventDefault
    document.ondrop = (event) =>
      handleFileDrop(event, systemId, showMask, hideMask, localConfig)

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

      // 执行验证
      const result = await verifyFormData(
        systemId,
        currentProjectId,
        projectNo,
        localConfig
      )

      if (!result.length) {
        updateVerifyButtonStatus(true)
        Qmsg.success('初步验证通过', { timeout: 500 })
        return
      }

      updateVerifyButtonStatus(false)
      Qmsg.warning('初步验证未通过' + JSON.stringify(result, null, 2), {
        showClose: true,
        timeout: 4000,
      })
    }
  },
})

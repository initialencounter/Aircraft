import type { PekData, SekData, SummaryFromLLM } from '@aircraft/validators'
import { getProjectAttachmentInfo } from '../utils/api'
import { getCurrentProjectNo, getNotification } from '../utils/helpers'
import { getFormData } from '../utils/form'
import type { LocalConfig } from '../../share/utils'

/**
 * 处理文件拖放事件
 */
export async function handleFileDrop(
  event: DragEvent,
  systemId: 'pek' | 'sek',
  showMask: () => void,
  hideMask: () => void,
  localConfig: typeof LocalConfig
): Promise<void> {
  event.stopPropagation()
  event.preventDefault()

  const fileList = event.dataTransfer!.files
  if (fileList.length === 0) {
    return
  }

  showMask()
  const filesData: FileData[] = []

  // 遍历 FileList 并将每个文件转换为 ArrayBuffer
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    const reader = new FileReader()
    await new Promise<void>((resolve) => {
      reader.onload = () => {
        const arrayBuffer = reader.result
        const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer)
        filesData.push({
          name: file.name,
          type: file.type,
          data: Array.from(uint8Array),
        })
        resolve()
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const response = await chrome.runtime.sendMessage({
    action: 'uploadLLMFiles',
    aircraftServer: localConfig.aircraftServer,
    files: filesData,
  })

  let summaryFromLLM = JSON.parse(response)
  if (typeof summaryFromLLM !== 'object') {
    summaryFromLLM = JSON.parse(summaryFromLLM)
  }

  console.log('summaryFromLLM', summaryFromLLM)
  await llmChecker(summaryFromLLM, systemId, localConfig)
  hideMask()
}

/**
 * LLM验证器
 */
export async function llmChecker(
  summaryFromLLM: SummaryFromLLM,
  systemId: 'pek' | 'sek',
  localConfig: typeof LocalConfig
): Promise<void> {
  const Qmsg = getNotification()
  const projectNo = getCurrentProjectNo()
  if (!projectNo) return

  let dataFromForm = null
  let is_965 = false

  if (systemId === 'pek') {
    dataFromForm = getFormData<PekData>(systemId)
    is_965 = dataFromForm.inspectionItem1 === 0
  } else {
    dataFromForm = getFormData<SekData>(systemId)
    is_965 = dataFromForm.otherDescribe === '540'
  }

  const attachmentInfo = await getProjectAttachmentInfo(
    projectNo,
    is_965,
    localConfig
  )
  if (!attachmentInfo) return

  const summaryInfo = attachmentInfo.summary
  const result = window.checkSummaryFromLLM(summaryFromLLM, summaryInfo)

  const panelTitle = document.querySelector(
    'body > div.panel.easyui-fluid > div.panel-header > div.panel-title'
  ) as HTMLDivElement

  if (!result.length) {
    Qmsg.success('LLM验证通过', { timeout: 500 })
    if (panelTitle) {
      panelTitle.innerText = 'LLM验证通过'
      panelTitle.style.color = '#238636'
    }
    return
  }

  if (panelTitle) {
    panelTitle.innerText = 'LLM验证未通过'
    panelTitle.style.color = '#fa5e55'
  }

  Qmsg.warning('LLM验证未通过' + JSON.stringify(result, null, 2), {
    showClose: true,
    timeout: 4000,
  })
}

export interface FileData {
  name: string
  type: string
  data: number[]
}

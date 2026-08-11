import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import type { SummaryFromLLM } from '@aircraft/validators'
import { checkSummaryFromLLM } from '@aircraft/validators'
import { SummaryInfo } from 'aircraft-rs'
import { getServerPort } from '../utils/utils'
import { useSummaryStore } from './summary'
import { useLogStore } from './logs'
import {
  SummaryFormJSONData2SummaryFromLLM,
  summaryInfoToSummaryFromLLM,
} from '../../../wxt/share/convert'
import type { SummaryFormJSONData } from '../../../wxt/share/types'

interface FileData {
  name: string
  type: string
  data: number[]
}

// 解析是跨视图的后台任务：状态和日志轮询都跟着 store 走，切换视图不影响解析
export const useParseStore = defineStore('parse', {
  state: () => ({
    loading: false,
    // PDF 是否已成功解析（解析与对比已拆开，对比前需先解析）
    pdfParsed: false,
    // 从 docx/剪贴板得到的概要信息，对比时需要它
    docxInfo: null as SummaryFromLLM | null,
  }),
  actions: {
    // 只解析 PDF（耗时操作），可预先完成，无需等待 docx
    async parsePdf(file: File) {
      this.loading = true
      useLogStore().startGetLog()
      try {
        const pdfDataUrl = await fileToBase64(file)
        if (!pdfDataUrl) {
          ElMessage.error('文件解析失败')
          return
        }

        const pdfFileData = await fileTransfer(file)
        if (!pdfFileData) {
          ElMessage.error('文件解析失败')
          return
        }
        const pdfRes: SummaryFromLLM | null = JSON.parse(
          (await getReportInfo(pdfFileData)) ?? '{}'
        ) as SummaryFromLLM

        if (!pdfRes) {
          ElMessage.error('文件解析失败')
          return
        }

        useSummaryStore().setPdf(pdfRes)
        this.pdfParsed = true
        ElMessage.success('PDF解析完成')
      } catch (e) {
        console.log(e)
        ElMessage.error('解析失败' + e)
      } finally {
        this.loading = false
        useLogStore().stopGetLog()
      }
    },
    // 只做对比：需要已解析的 PDF 结果和 docx/剪贴板概要
    compareReport() {
      if (!this.pdfParsed) {
        ElMessage.error('请先解析PDF')
        return
      }
      if (!this.docxInfo) {
        ElMessage.error('没有概要信息，请先拖入docx或读取剪贴板')
        return
      }
      const result = checkSummaryFromLLM(useSummaryStore().pdf, this.docxInfo)
      useSummaryStore().setResult(result.map((item) => item.result))
      ElMessage.success('对比完成')
    },
    async parseDocx(file: File) {
      this.loading = true
      useLogStore().startGetLog()
      try {
        const docxFileData = await fileTransfer(file)
        if (docxFileData) {
          const docxRes = await getSummaryInfo(docxFileData)
          if (docxRes) {
            const summaryInfo = summaryInfoToSummaryFromLLM(docxRes)
            this.docxInfo = summaryInfo
            useSummaryStore().setDocx(summaryInfo)
            ElMessage.success('已自动解析概要')
          }
        }
      } catch (e) {
        console.log(e)
      } finally {
        this.loading = false
        useLogStore().stopGetLog()
      }
    },
    setClipboardSummary(data: SummaryFormJSONData) {
      const summaryInfo: SummaryFromLLM =
        SummaryFormJSONData2SummaryFromLLM(data)
      this.docxInfo = summaryInfo
      useSummaryStore().setDocx(summaryInfo)
    },
  },
})

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const base64String = reader.result as string
      resolve(base64String)
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsDataURL(file)
  })
}

function fileTransfer(file: File): Promise<FileData | null> {
  return new Promise<FileData | null>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const arrayBuffer = reader.result
      const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer)
      resolve({
        name: file.name,
        type: file.type,
        data: Array.from(uint8Array),
      })
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsArrayBuffer(file)
  })
}

// 缓存端口查询结果，避免每次请求都做一次 IPC 往返
let portPromise: Promise<number> | null = null
function getPort(): Promise<number> {
  if (!portPromise) portPromise = getServerPort()
  return portPromise
}

async function getSummaryInfo(file: FileData) {
  try {
    const formData = new FormData()
    const uint8Array = new Uint8Array(file.data)
    const blob = new Blob([uint8Array], { type: file.type })
    formData.append('file', blob, file.name)

    const response = await fetch(
      `http://127.0.0.1:${await getPort()}/get-summary-info`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('getSummaryInfo HTTP 错误:', errorText)
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }
    const data = await response.json()
    return data as SummaryInfo
  } catch (error) {
    console.error('获取docx概要信息失败:', error)
    ElMessage.error('获取docx概要信息失败: ' + error)
    return null
  }
}

async function getReportInfo(file: FileData) {
  try {
    const formData = new FormData()
    const uint8Array = new Uint8Array(file.data)
    const blob = new Blob([uint8Array], { type: file.type })
    formData.append('file', blob, file.name)

    const response = await fetch(
      `http://127.0.0.1:${await getPort()}/upload-llm-files`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('getReportInfo HTTP 错误:', errorText)
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }
    const data = await response.json()
    return data as string
  } catch (error) {
    console.error('获取PDF报告信息失败:', error)
    ElMessage.error('获取PDF报告信息失败: ' + error)
    return null
  }
}

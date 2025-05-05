import type { Context } from 'cordis'
import { Service } from 'cordis'
import type {
  FileManager,
  HotkeyConfig,
  LLMConfig,
  ServerConfig,
} from 'aircraft-rs'

import type { ConfigManager } from './config'

declare module 'cordis' {
  interface Context {
    llm: LLM
    configManager: ConfigManager
  }
  interface Events {
    'reload-server': (serverConfig: ServerConfig, llmConfig: LLMConfig) => void
    'reload-llm': (llmConfig: LLMConfig) => void
    'reload-hotkey': (hotkey: HotkeyConfig) => void
  }
}

class LLM extends Service {
  static inject = ['http', 'bindings', 'configManager']
  private bindings: FileManager
  constructor(ctx: Context) {
    super(ctx, 'llm')
    const llmConfig = ctx.configManager.getConfig().llm
    this.bindings = new ctx.bindings.native.FileManager(
      llmConfig.baseUrl,
      llmConfig.apiKey,
      llmConfig.model
    )
    ctx.on('reload-llm', (llmConfig) => {
      this.reload(llmConfig)
    })
  }
  /**
   * 重载配置
   * @param llmConfig
   */
  async reload(llmConfig: LLMConfig) {
    await this.bindings.reload(
      llmConfig.baseUrl,
      llmConfig.apiKey,
      llmConfig.model
    )
  }
  /**从pdf buffer中读取提取文本内容*/
  async readPdfBuffer(buffer: Array<number>): Promise<string> {
    return await this.bindings.readPdfBuffer(buffer)
  }
  async parsePdf(path: Array<string>): Promise<string> {
    return await this.bindings.parsePdf(path)
  }
  async parsePdfU8(filename: string, buffer: Array<number>): Promise<string> {
    return await this.bindings.parsePdfU8(filename, buffer)
  }
  async chatWithAiFastAndCheap(fileContents: Array<string>): Promise<string> {
    return await this.bindings.chatWithAiFastAndCheap(fileContents)
  }
  async uploadLLMFiles(buf: Buffer): Promise<string> {
    const u8 = Array.from(buf)
    let pdfText = await this.bindings.readPdfBuffer(u8)
    if (!pdfText.trim().length) {
      pdfText = await this.bindings.parsePdfU8('UN38.3 Test Report.pdf', u8)
    }
    if (!pdfText.trim().length) {
      throw new Error('PDF解析失败')
    }
    return await this.bindings.chatWithAiFastAndCheap([pdfText])
  }
}

export { LLM }

import { Context, Service } from 'cordis'
import type { } from '@cordisjs/plugin-http'
import type { } from '@cordisjs/plugin-server'
import type { } from '../service/bindings'
import { LLMConfig } from '../../types';
import { ConfigManager } from './config';
import { FileManager } from '../../../bindings/node';

declare module 'cordis' {
  interface Context {
    llm: LLM
    configManager: ConfigManager
  }
}

class LLM extends Service {
  static inject = ['http', 'bindings', 'configManager']
  private bindings: FileManager;
  constructor(ctx: Context) {
    super(ctx, 'llm')
    ctx.on('bindings-ready', () => {
      const llmConfig = ctx.configManager.getConfig<'llm'>('llm');
      this.bindings = new ctx.bindings.bindings.FileManager(llmConfig.base_url, llmConfig.api_key, llmConfig.model);
    })
  }
  /**
   * 重载配置
   * @param llmConfig 
   */
  async reload(llmConfig: LLMConfig) {
    await this.bindings.reload(llmConfig.base_url, llmConfig.api_key, llmConfig.model);
  }
  /**从pdf buffer中读取提取文本内容*/
  async readPdfBuffer(buffer: Array<number>): Promise<string> {
    return await this.bindings.readPdfBuffer(buffer);
  }
  async parsePdf(path: Array<string>): Promise<string> {
    return await this.bindings.parsePdf(path);
  }
  async parsePdfU8(filename: string, buffer: Array<number>): Promise<string> {
    return await this.bindings.parsePdfU8(filename, buffer);
  }
  async chatWithAiFastAndCheap(fileContents: Array<string>): Promise<string> {
    return await this.bindings.chatWithAiFastAndCheap(fileContents);
  }
  async uploadLLMFiles(buf: Buffer): Promise<string> {
    let u8 = Array.from(buf)
    let pdfText = await this.bindings.readPdfBuffer(u8);
    if (!pdfText.trim().length) {
      pdfText = await this.bindings.parsePdfU8('UN38.3 Test Report.pdf', u8);
    }
    if (!pdfText.trim().length) {
      throw new Error('PDF解析失败');
    }
    let res = await this.bindings.chatWithAiFastAndCheap([pdfText]);
    return res;
  }
}

export { LLM }
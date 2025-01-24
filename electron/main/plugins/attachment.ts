import { Context } from 'cordis'
import { resolve } from 'path';
import { } from '@cordisjs/plugin-http'
import { } from '@cordisjs/plugin-server'
import { } from '../service/bindings'
import cors from '@koa/cors';

class Attachment {
  static inject = ['server', 'http', 'bindings']
  private ctx: Context
  private bindings: any;
  constructor(ctx: Context) {
    this.ctx = ctx
    ctx.on('bindings-ready', () => {
      this.bindings = new ctx.bindings.bindings.AircraftRs();
    })

    // 使用 cors 中间件
    ctx.server.use(cors({
      origin: '*',  // 允许所有来源
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }));

    ctx.server.get('/get-attachment-info/:projectNo', async (ctx) => {
      const projectNo = ctx.params.projectNo;
      const attachmentInfo = await this.getAttachmentInfo(projectNo)
      ctx.body = attachmentInfo;
      ctx.status = 200;
    })
  }
  async getAttachmentInfo(projectNo: string): Promise<AttachmentInfo> {
    const summaryPath = await this.getSummaryPath(projectNo);
    const goodsPath = await this.getGoodsPath(projectNo);
    return {
      summary: JSON.parse(this.bindings.getSummaryInfo(summaryPath)),
      goods: JSON.parse(this.bindings.parseGoodsInfo(goodsPath))
    };
  }

  async searchAttachment(projectNo: string): Promise<SearchResponse> {
    const params = new URLSearchParams({
      search: projectNo,
      json: '1',
      path_column: '1',
    });
    const response = await this.ctx.http.get(`http://localhost:25456?${params.toString()}`);
    return response as SearchResponse;
  }


  async getSummaryPath(projectNo: string): Promise<string> {
    const searchRes = await this.searchAttachment(projectNo);
    const attachmentInfo = this.filterFileExtension(searchRes, '.docx');
    return resolve(attachmentInfo[0].path, attachmentInfo[0].name);
  }

  async getGoodsPath(projectNo: string): Promise<string> {
    const searchRes = await this.searchAttachment(projectNo);
    const attachmentInfo = this.filterFileExtension(searchRes, `${projectNo}.pdf`);
    return resolve(attachmentInfo[0].path, attachmentInfo[0].name);
  }

  filterFileExtension(searchRes: SearchResponse, extension: string): SearchResult[] {
    const res: SearchResult[] = [];
    for (const item of searchRes.results) {
      if (item.name.endsWith(extension)) {
        res.push(item);
      }
    }
    return res;
  }
}

export { Attachment }

interface SearchResult {
  name: string;
  path: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export interface SummaryInfo {
  // 标题
  title: string,
  // 项目编号
  projectNo: string,
  // 签发日期
  issueDate: string,
  capacity: string;
  classification: string;
  cnName: string;
  color: string;
  consignor: string;
  consignorInfo: string;
  enName: string;
  id: string;
  licontent: string;
  manufacturer: string;
  manufacturerInfo: string;
  mass: string;
  note: string;
  projectId: string;
  shape: string;
  test1: string;
  test2: string;
  test3: string;
  test4: string;
  test5: string;
  test6: string;
  test7: string;
  test8: string;
  testDate: string;
  testlab: string;
  testlabInfo: string;
  testManual: string;
  testReportNo: string;
  trademark: string;
  type: string;
  un38f: string;
  un38g: string;
  voltage: string;
  watt: string;
}

export interface GoodsInfo {
  projectNo: string;
  name: string;
  labels: string[];
}

export interface AttachmentInfo {
  summary: SummaryInfo;
  goods: GoodsInfo;
}
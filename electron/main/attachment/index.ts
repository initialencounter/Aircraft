import axios from 'axios';
import { resolve } from 'path';

interface SearchResult {
  name: string;
  path: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface AttachmentInfo {
  summary: any;
  goods: any;
}

class AttachmentManager {
  private bindings: any;

  constructor(aircraftRs: new () => any) {
    this.bindings = new aircraftRs();
  }

  async getAttachmentInfo(projectNo: string): Promise<AttachmentInfo> {
    const summaryPath = await this.getSummaryPath(projectNo);
    const goodsPath = await this.getGoodsPath(projectNo);
    console.log(summaryPath, goodsPath);
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
    const res = await axios.get(`http://localhost:25456?${params.toString()}`);
    return res.data;
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

export { AttachmentManager };

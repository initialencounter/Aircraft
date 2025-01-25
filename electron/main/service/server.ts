import cors from '@koa/cors';
import { Context, Service } from 'cordis'
import {  } from '@cordisjs/plugin-server'
import {  } from '../service/attachment'

class AircraftServer extends Service {
  static inject = ['server', 'attachment']

  constructor(ctx: Context) {
    super(ctx, 'aircraftServer')
    // 使用 cors 中间件
    ctx.server.use(cors({
      origin: '*',  // 允许所有来源
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }));
    
    ctx.server.get('/get-attachment-info/:projectNo', async (ctx) => {
      const projectNo = ctx.params.projectNo;
      const attachmentInfo = await this.ctx.attachment.getAttachmentInfo(projectNo)
      ctx.body = attachmentInfo;
      ctx.status = 200;
    })
  }
}

export { AircraftServer }


import cors from '@koa/cors'
import multer from '@koa/multer'
import Router from '@koa/router'
import type { Context } from 'cordis'
import { Service } from 'cordis'

import type {} from '@cordisjs/plugin-server'
import type { Attachment } from '../service/attachment'
import type { LLM } from '../service/llm'

declare module 'cordis' {
  interface Context {
    attachment: Attachment
    llm: LLM
  }
}

const router = new Router()
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

class AircraftServer extends Service {
  static inject = ['server', 'attachment', 'llm']

  constructor(ctx: Context) {
    super(ctx, 'aircraftServer')

    // 上传LLM解析PDF
    router.post(
      '/upload-llm-files',
      upload.fields([
        {
          name: 'file',
        },
      ]),
      async (ctx1) => {
        // @ts-ignore
        const buf = ctx1?.files?.file[0].buffer
        const res = await this.ctx.llm.uploadLLMFiles(buf)
        ctx1.body = res
      }
    )

    ctx.server.use(router.routes())
    ctx.server.use(router.allowedMethods())

    // 使用 cors 中间件
    ctx.server.use(
      cors({
        origin: '*', // 允许所有来源
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      })
    )

    ctx.server.get('/get-attachment-info/:projectNo', async (ctx) => {
      const projectNo = ctx.params.projectNo
      const is_965 = ctx.query.is_965 === '1'
      const attachmentInfo = await this.ctx.attachment.getAttachmentInfo(
        projectNo,
        is_965
      )
      ctx.body = attachmentInfo
      ctx.status = 200
    })
  }
}

export { AircraftServer }

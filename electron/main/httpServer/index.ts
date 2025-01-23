import express from 'express'
import cors from 'cors'
import type http from 'http'
class HttpServer {
  port: number;
  app: express.Application;
  server: http.Server | null;
  getAttachmentInfo: (projectNo: string) => Promise<any>;

  constructor(getAttachmentInfo: (projectNo: string) => Promise<any>) {
    this.port = 25455
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
    this.getAttachmentInfo = getAttachmentInfo
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    }))
  }

  setupRoutes() {
    this.app.get('/get-attachment-info/:projectNo', this.handleGetAttachmentInfo.bind(this))
  }

  async handleGetAttachmentInfo(req: express.Request, res: express.Response) {
    try {
      const projectNo: string = req.params.projectNo
      const attachmentInfo = await this.getAttachmentInfo(projectNo)
      res.json(attachmentInfo)
    } catch (error) {
      res.status(500).json({
        message: `获取项目信息失败: ${error.message}`
      })
    }
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`HTTP Server running on http://localhost:${this.port}`)
    })
  }

  stop() {
    if (this.server) {
      this.server.close()
    }
  }
}

export { HttpServer };
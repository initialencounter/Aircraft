import { mkdirSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { rm } from 'fs/promises'

import type { Context } from 'cordis'
import { Schema, Service } from 'cordis'
import type {} from './app'

import Logger from 'reggol'
import { ipcMain } from 'electron'

import { FileWriter } from '../external/loggerFileWriter'

Logger.targets[0].showTime = 'yyyy-MM-dd hh:mm:ss'
Logger.targets[0].label = {
  align: 'left',
}
Logger.targets[0].colors = 4

export const name = 'logger'

export interface LogMessage {
  time_stamp: string
  level: string
  message: string
}

export function formatLogMessage(record: Logger.Record): LogMessage {
  return {
    time_stamp: new Date(record.timestamp).toISOString().slice(0, 19),
    level: record.type.toUpperCase(),
    message: record.content,
  }
}

declare module 'cordis' {
  interface Context {
    loggerService: LoggerService
  }
}

class LoggerService extends Service {
  static inject = ['app']
  writer: FileWriter
  root: string
  files: Record<string, number[]>
  config: LoggerService.Config
  tempLogs: Logger.Record[]
  constructor(ctx: Context, config: LoggerService.Config) {
    super(ctx, 'loggerService')
    this.config = config
    this.tempLogs = []
    this.root = resolve(ctx.app.APP_CONFIG_PATH, 'logs')
    mkdirSync(this.root, { recursive: true })

    this.files = {}
    for (const filename of readdirSync(this.root)) {
      const capture = /^(\d{4}-\d{2}-\d{2})-(\d+)\.log$/.exec(filename)
      if (!capture) continue
      this.files[capture[1]] ??= []
      this.files[capture[1]].push(+capture[2])
    }

    const date = new Date().toISOString().slice(0, 10)
    this.createFile(date, Math.max(...(this.files[date] ?? [0])) + 1)

    let buffer: Logger.Record[] = []
    const update = ctx.throttle(() => {
      // Be very careful about accessing service in this callback,
      // because undeclared service access may cause infinite loop.
      ctx.get('console')?.patch('logs', buffer)
      buffer = []
    }, 100)

    const loader = ctx.get('loader')
    const target: Logger.Target = {
      colors: 3,
      record: (record: Logger.Record) => {
        ipcMain.emit('logger:push', formatLogMessage(record))
        this.tempLogs.push(record)
        record.meta ||= {}
        const date = new Date(record.timestamp).toISOString().slice(0, 10)
        if (this.writer.date !== date) {
          this.writer.close()
          this.files[date] = [1]
          this.createFile(date, 1)
        }
        this.writer.write(record)
        buffer.push(record)
        update()
        if (this.writer.size >= config.maxSize) {
          this.writer.close()
          const index = Math.max(...(this.files[date] ?? [0])) + 1
          this.files[date] ??= []
          this.files[date].push(index)
          this.createFile(date, index)
        }
      },
    }

    Logger.targets.push(target)
    ctx.on('dispose', () => {
      this.writer?.close()
      if (loader) {
        loader.prolog = []
      }
    })

    for (const record of loader?.prolog || []) {
      target.record?.(record)
    }
    ctx.on('ready', async () => {
      this.tempLogs = await this.writer.read()
    })
  }
  async createFile(date: string, index: number) {
    this.writer = new FileWriter(date, `${this.root}/${date}-${index}.log`)

    const { maxAge } = this.config
    if (!maxAge) return

    const now = Date.now()
    for (const date of Object.keys(this.files)) {
      if (now - +new Date(date) < maxAge * 86400000) continue
      for (const index of this.files[date]) {
        await rm(`${this.root}/${date}-${index}.log`).catch((error) => {
          this.ctx.logger('logger').warn(error)
        })
      }
      delete this.files[date]
    }
  }

  tryGetLogs() {
    const logs = this.tempLogs
    this.tempLogs = []
    return logs
  }
}

namespace LoggerService {
  export interface Config {
    maxAge: number
    maxSize: number
  }

  export const Config: Schema<Config> = Schema.object({
    maxAge: Schema.natural().default(30),
    maxSize: Schema.natural().default(1024 * 100),
  })
}

export { LoggerService }

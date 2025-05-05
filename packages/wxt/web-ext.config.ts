import { resolve } from 'node:path'
import { defineWebExtConfig } from 'wxt'
import dotenv from 'dotenv'
dotenv.config()

const startUrls = process.env.START_URLS?.split(',') || ['https://wxt.dev']

export default defineWebExtConfig({
  // On Windows, the path must be absolute
  startUrls: startUrls,
  chromiumProfile: resolve('./chrome-data'),
  keepProfileChanges: true,
})

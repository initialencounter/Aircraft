import { resolve } from 'node:path'
import { defineWebExtConfig } from 'wxt'

export default defineWebExtConfig({
  // On Windows, the path must be absolute
  chromiumProfile: resolve('./chrome-data'),
  keepProfileChanges: true,
  binaries: {
    chrome: 'C:\\Users\\29115\\AppData\\Local\\360ChromeX\\Chrome\\Application\\360ChromeX.exe',
    edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    firefox: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  },
})

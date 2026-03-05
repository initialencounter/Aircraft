import { resolve } from 'node:path'
import { defineWebExtConfig } from 'wxt'

export default defineWebExtConfig({
  // On Windows, the path must be absolute
  chromiumProfile: resolve('./chrome-data'),
  firefoxProfile: resolve('./.wxt/firefox-data'),
  keepProfileChanges: true,
  binaries: {
    chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    firefox: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  },
})

import { startSyncInterval } from '../share/screenshot'
import { sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  await sleep(500)
  startSyncInterval()
}

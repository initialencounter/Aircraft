import { getLocalConfig } from '../share/utils'
import { mountChecklistPanel } from './modules/checklist/panel'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
    'https://*/pek/inspect*',
  ],
  allFrames: true,
  async main() {
    const localConfig = await getLocalConfig()
    if (!localConfig.enableChecklist) return
    await mountChecklistPanel()
  },
})

import { startSyncInterval } from "@/share/screenshot";
import { sleep } from "@/share/utils";

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/'
  ],
  allFrames: true,
  async main() {
    entrypoint()
  }
});


function entrypoint(){
  sleep(500)
  startSyncInterval()
}
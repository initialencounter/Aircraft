import { AttachmentManager } from "../attachment";
import { HttpServer } from "../httpServer";
import path from "path";
import { AircraftRs } from "aircraft-rs";

async function webHookStart(dirname: string) {
  let attachmentManager = new AttachmentManager(AircraftRs)
  let webhook = new HttpServer(attachmentManager.getAttachmentInfo.bind(attachmentManager))
  webhook.start();
}


export { webHookStart }
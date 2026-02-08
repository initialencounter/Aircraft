import * as ort from "onnxruntime-web/webgpu";
import { predict_yolo26 } from "../share/yolo";

export default defineUnlistedScript(() => {
  let session: ort.InferenceSession;

  (async () => {
    try {
      const modelUrl = chrome.runtime.getURL('segment.onnx');
      console.log("Loading model from", modelUrl);
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['webgpu'],
      });
      console.log("Model loaded successfully");
      chrome.runtime.sendMessage({ action: 'madeModel', input: session.inputNames });
    }
    catch (e) {
      chrome.runtime.sendMessage({ action: 'madeModel', input: "Model Import Error" });
    }

    chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
      if (request.action == "yolo-inference") {
        (async () => {
          try {
            const result = await predict_yolo26(session, new Uint8Array(request.input));
            sendResponse({ success: true, result });
          } catch (error) {
            console.error("Error during YOLO inference:", error);
            sendResponse({ success: false });
          }
        })();
      }
      return true;
    });
  })();
});
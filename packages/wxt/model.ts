import * as ort from "onnxruntime-web/webgpu";
import { createPPOcrRuntime, recognizeTextFromImageBytes, type PPOcrRuntime } from "./share/ppocr";
import { predict_yolo26 } from "./share/yolo";

let session: ort.InferenceSession;
let ppocrRuntime: PPOcrRuntime | null = null;

(async () => {
  try {
    const modelUrl = chrome.runtime.getURL('segment.onnx');
    console.log("Loading model from", modelUrl);
    try {
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['webgpu'],
      });
      console.log("Model loaded successfully with WebGPU");
    } catch (webgpuError) {
      console.warn("WebGPU unavailable, falling back to wasm:", webgpuError);
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
      });
      console.log("Model loaded successfully with wasm");
    }

    ppocrRuntime = await createPPOcrRuntime(ort, {
      detModelUrl: chrome.runtime.getURL('en_PP-OCRv3_det.onnx'),
      recModelUrl: chrome.runtime.getURL('en_PP-OCRv4_rec.onnx'),
      dictUrl: chrome.runtime.getURL('dict.txt'),
      executionProviders: ['wasm'],
      wasmConfig: {
        simd: true,
        numThreads: Math.max(1, Math.min(4, navigator.hardwareConcurrency ?? 1)),
        wasmPaths: {
          wasm: chrome.runtime.getURL('ort-wasm-simd-threaded.asyncify.wasm'),
        },
      },
    });
    console.log("PPOCR loaded successfully with wasm simd");

    chrome.runtime.sendMessage({ action: 'madeModel', input: { yolo: session.inputNames, ppocr: true } });
  }
  catch (e) {
    console.error("Error loading model:", e);
    chrome.runtime.sendMessage({ action: 'madeModel', input: "Model Import Error" });
  }

  chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
    if (request.action == "yolo-inference") {
      (async () => {
        try {
          const result = await predict_yolo26(session, new Uint8Array(request.input), ort.Tensor);
          sendResponse({ success: true, result });
        } catch (error) {
          console.error("Error during YOLO inference:", error);
          sendResponse({ success: false });
        }
      })();
    }

    if (request.action == "ppocr-inference") {
      (async () => {
        try {
          if (!ppocrRuntime) {
            sendResponse('');
            return;
          }
          const result = await recognizeTextFromImageBytes(
            new Uint8Array(request.input),
            ppocrRuntime,
            request.polygon,
          );
          sendResponse(result);
        } catch (error) {
          console.error("Error during PPOCR inference:", error);
          sendResponse('');
        }
      })();
    }
    return true;
  });
})();
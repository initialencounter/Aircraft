import * as ort from "onnxruntime-web/webgpu";
import { process_output } from "../share/yolo";

const yoloClasses = ['9', '9A', 'BTY', 'CAO']

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
        console.log("Received yolo-inference request");
        predict(yoloClasses, session, request.input).then((result) => {
          console.log("Prediction result", result);
          sendResponse({ result });
        }).catch((error) => {
          console.error("Prediction error", error);
          sendResponse({ result: [], error: error.message });
        });
        return true; // 保持消息通道开放,等待异步响应
      }
      return false;
    });
  })();

  async function predict(yoloClasses: string[], session: ort.InferenceSession, imageInput: Array<number>) {
    let rowImageWidth: number;
    let rowImageHeight: number;
    const width = 640;
    const height = 640;

    // 创建 OffscreenCanvas 来处理图片
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    const blob = new Blob([new Uint8Array(imageInput)], { type: 'image/png' });
    const imageBitmap = await createImageBitmap(blob);

    rowImageWidth = imageBitmap.width;
    rowImageHeight = imageBitmap.height;

    // 在 Canvas 上绘制缩放后的图片
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    // 获取图片数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // 将图片数据转换为 Float32Array
    const inputData = new Float32Array(1 * 3 * width * height);

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixelIndex = (i * width + j) * 4; // 每个像素有 4 个值（RGBA）
        // @ts-ignore
        const r = pixels[pixelIndex] / 255.0;     // R
        // @ts-ignore
        const g = pixels[pixelIndex + 1] / 255.0; // G
        // @ts-ignore
        const b = pixels[pixelIndex + 2] / 255.0; // B

        // 将数据填充到 inputData 中，布局为 [1, 3, 640, 640]
        inputData[i * width + j] = r;               // R 通道
        inputData[width * height + i * width + j] = g; // G 通道
        inputData[2 * width * height + i * width + j] = b; // B 通道
      }
    }

    const inputTensor = new ort.Tensor("float32", inputData, [1, 3, 640, 640]);
    const feeds = { "images": inputTensor };
    let res = await session.run(feeds)
    // @ts-ignore
    return process_output(res['output0']['data'], res['output1']['data'], rowImageWidth, rowImageHeight, yoloClasses)
  }
});
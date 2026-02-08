import { SegmentResult } from 'aircraft-rs';
import * as ort from "onnxruntime-web";

const yolo_classes = ['9', '9A', 'bty', 'CAO'];

export async function predict_yolo26(session: any, imageInput: Uint8Array) {
  try {

    let rowImageWidth: number;
    let rowImageHeight: number;
    const width = 640;
    const height = 640;

    // 创建 OffscreenCanvas 来处理图片
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // 从 Uint8Array 创建 ImageBitmap
    // @ts-ignore
    const blob = new Blob([imageInput], { type: 'image/png' });
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
        const pixelIndex = (i * width + j) * 4;
        const r = pixels[pixelIndex] / 255.0;
        const g = pixels[pixelIndex + 1] / 255.0;
        const b = pixels[pixelIndex + 2] / 255.0;

        inputData[i * width + j] = r;
        inputData[width * height + i * width + j] = g;
        inputData[2 * width * height + i * width + j] = b;
      }
    }

    const inputTensor = new ort.Tensor("float32", inputData, [1, 3, 640, 640]);
    // const inputName = session.inputNames[0]; // images
    const feeds = { "images": inputTensor };

    const res = await session.run(feeds);
    return process_yolo26_output(res['output0']['data'], rowImageWidth, rowImageHeight);
  } catch (error) {
    console.error('predict error:', error);
    return [];
  }
}

// YOLO26 专用处理函数
export function process_yolo26_output(output: any, img_width: number, img_height: number, confidence_threshold: number = 0.35): SegmentResult[] {
  const result: SegmentResult[] = [];
  const inputSize = 640; // YOLO26 模型输入尺寸

  // JavaScript 输出已经展开为一维数组: 300x38 -> [300*38] 
  // 前6个值为: [x1, y1, w, h, confidence, class_id]
  const flatOutput = output;
  const numDetections = 300;
  const featuresPerDetection = 38;


  for (let i = 0; i < numDetections; i++) {
    const baseIndex = i * featuresPerDetection;

    // 提取前6个值 [x1, y1, w, h, confidence, class_id]
    const xc = flatOutput[baseIndex];
    const yc = flatOutput[baseIndex + 1];
    const w = flatOutput[baseIndex + 2];
    const h = flatOutput[baseIndex + 3];
    const confidence = flatOutput[baseIndex + 4];
    const classId = flatOutput[baseIndex + 5];

    // 过滤低置信度检测
    if (confidence < confidence_threshold) {
      continue;
    }

    // 验证类别ID
    if (classId < 0 || classId >= yolo_classes.length) {
      continue;
    }

    const x1 = (xc / inputSize) * img_width;
    const y1 = (yc / inputSize) * img_height;
    const x2 = (w / inputSize) * img_width;
    const y2 = (h / inputSize) * img_height;
    const label = yolo_classes[classId];

    result.push({
      x1,
      y1,
      x2,
      y2,
      label,
      confidence,
      mask: [] // 暂不计算分割掩码, 提高性能
    });
  }

  return result;
}

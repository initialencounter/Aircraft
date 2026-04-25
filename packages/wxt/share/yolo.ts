import { SegmentResult } from 'aircraft-rs';
import { maskXYTo4ptPolygon, Point } from './maskXYTo4ptPolygon';

const yolo_classes = ['9', '9A', 'bty', 'CAO'];

function extractContourPointsFromMask(
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
  offsetX: number,
  offsetY: number,
  threshold: number = 0.5,
): Point[] {
  const contourPoints: Point[] = [];

  if (maskWidth <= 0 || maskHeight <= 0 || mask.length === 0) {
    return contourPoints;
  }

  const isForeground = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= maskWidth || y >= maskHeight) {
      return false;
    }
    return mask[y * maskWidth + x] >= threshold;
  };

  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      if (!isForeground(x, y)) {
        continue;
      }

      const isBoundary = !isForeground(x - 1, y)
        || !isForeground(x + 1, y)
        || !isForeground(x, y - 1)
        || !isForeground(x, y + 1);

      if (!isBoundary) {
        continue;
      }

      contourPoints.push([offsetX + x, offsetY + y]);
    }
  }

  return contourPoints;
}

function normalizeBox(x1: number, y1: number, x2: number, y2: number) {
  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
  };
}

export async function predict_yolo26(session: any, imageInput: Uint8Array, Tensor: any) {
  try {

    let originalWidth: number;
    let originalHeight: number;
    const width = 640;
    const height = 640;

    // 创建 OffscreenCanvas 来处理图片
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // 从 Uint8Array 创建 ImageBitmap
    // @ts-ignore
    const blob = new Blob([imageInput], { type: 'image/png' });
    const imageBitmap = await createImageBitmap(blob);

    originalWidth = imageBitmap.width;
    originalHeight = imageBitmap.height;

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

    const inputTensor = new Tensor("float32", inputData, [1, 3, 640, 640]);
    // const inputName = session.inputNames[0]; // images
    const feeds = { "images": inputTensor };

    const res = await session.run(feeds);
    return process_yolo26_output(res['output0']['data'], res['output1']['data'], originalWidth, originalHeight);
  } catch (error) {
    console.error('predict error:', error);
    return [];
  }
}

// YOLO26 专用处理函数
export function process_yolo26_output(output: any, proto: any, originalWidth: number, originalHeight: number, confidence_threshold: number = 0.25): SegmentResult[] {
  const result: SegmentResult[] = [];
  const inputSize = 640; // YOLO26 模型输入尺寸

  // output0
  // JavaScript 输出已经展开为一维数组: 1x300x38 -> [1*300*38], 300个检测框, 每个框38个值
  // 前6个值为: [x1, y1, w, h, confidence, class_id]
  // 后续32个值为掩码系数（Mask Coefficients）

  // output1 原型掩码 1x32x160x160 
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
    let polygon: Point[] = [];
    // 过滤低置信度检测
    if (confidence < confidence_threshold) {
      continue;
    }

    // 验证类别ID
    if (classId < 0 || classId >= yolo_classes.length) {
      continue;
    }

    const { x1, y1, x2, y2 } = normalizeBox(
      (xc / inputSize) * originalWidth,
      (yc / inputSize) * originalHeight,
      (w / inputSize) * originalWidth,
      (h / inputSize) * originalHeight,
    );
    const label = yolo_classes[classId];

    if (label === 'bty') {
      const protoHeight = 160
      const protoWidth = 160
      const maskCoeffs = flatOutput.slice(baseIndex + 6, baseIndex + 6 + 32) as number[];
      const fullMask = new Float32Array(160 * 160)

      for (let h = 0; h < protoHeight; h++) {
        for (let w = 0; w < protoWidth; w++) {
          let sum = 0
          // 对每个通道进行计算
          for (let c = 0; c < 32; c++) {
            const protoIndex = c * protoHeight * protoWidth + h * protoWidth + w
            sum += maskCoeffs[c] * proto[protoIndex]
          }
          // 应用sigmoid激活函数
          fullMask[h * protoWidth + w] = 1 / (1 + Math.exp(-sum))
        }
      }

      // 1. 计算检测框在160x160 mask中的位置
      const maskWidth = 160
      const maskHeight = 160

      // 将边界框坐标映射到160x160的mask空间
      const maskX1 = Math.floor((x1 / originalWidth) * maskWidth)
      const maskY1 = Math.floor((y1 / originalHeight) * maskHeight)
      const maskX2 = Math.ceil((x2 / originalWidth) * maskWidth)
      const maskY2 = Math.ceil((y2 / originalHeight) * maskHeight)

      // 2. 提取对应区域的mask
      const boxMask = new Float32Array((maskX2 - maskX1) * (maskY2 - maskY1))
      let idx = 0

      for (let y = maskY1; y < maskY2; y++) {
        for (let x = maskX1; x < maskX2; x++) {
          if (x >= 0 && x < maskWidth && y >= 0 && y < maskHeight) {
            boxMask[idx] = fullMask[y * maskWidth + x]
          }
          idx++
        }
      }

      // 3. 将mask缩放到实际检测框大小（可选）
      const actualWidth = Math.max(1, Math.round(x2 - x1))
      const actualHeight = Math.max(1, Math.round(y2 - y1))
      const scaledMask = resizeMask(boxMask, maskX2 - maskX1, maskY2 - maskY1, actualWidth, actualHeight)

      const contourPoints = extractContourPointsFromMask(scaledMask, actualWidth, actualHeight, x1, y1)
      polygon = maskXYTo4ptPolygon(contourPoints);
    }

    result.push({
      x1,
      y1,
      x2,
      y2,
      label,
      confidence,
      mask: [], // 提高性能，暂不返回原始mask数据
      polygon,
    });
  }

  return result;
}

// mask缩放函数
function resizeMask(
  mask: Float32Array,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): Float32Array {
  const output = new Float32Array(toWidth * toHeight)

  for (let y = 0; y < toHeight; y++) {
    for (let x = 0; x < toWidth; x++) {
      // 双线性插值
      const srcX = (x / toWidth) * fromWidth
      const srcY = (y / toHeight) * fromHeight

      const x1 = Math.floor(srcX)
      const y1 = Math.floor(srcY)
      const x2 = Math.min(x1 + 1, fromWidth - 1)
      const y2 = Math.min(y1 + 1, fromHeight - 1)

      const xWeight = srcX - x1
      const yWeight = srcY - y1

      const val = mask[y1 * fromWidth + x1] * (1 - xWeight) * (1 - yWeight)
        + mask[y1 * fromWidth + x2] * xWeight * (1 - yWeight)
        + mask[y2 * fromWidth + x1] * (1 - xWeight) * yWeight
        + mask[y2 * fromWidth + x2] * xWeight * yWeight

      output[y * toWidth + x] = val
    }
  }

  return output
}
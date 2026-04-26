import { SegmentResult } from 'aircraft-rs';
import { maskXYTo4ptPolygon, Point } from './maskXYTo4ptPolygon';

const yolo_classes = ['9', '9A', 'bty', 'CAO'];
const YOLO_INPUT_SIZE = 640;
const YOLO_PROTO_WIDTH = 160;
const YOLO_PROTO_HEIGHT = 160;
const YOLO_MASK_CHANNELS = 32;
const INV_255 = 1 / 255;

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

  for (let y = 0; y < maskHeight; y += 1) {
    const rowOffset = y * maskWidth;
    const topOffset = rowOffset - maskWidth;
    const bottomOffset = rowOffset + maskWidth;
    for (let x = 0; x < maskWidth; x += 1) {
      const pixelIndex = rowOffset + x;
      if (mask[pixelIndex] < threshold) {
        continue;
      }

      const isBoundary = x === 0
        || x === maskWidth - 1
        || y === 0
        || y === maskHeight - 1
        || mask[pixelIndex - 1] < threshold
        || mask[pixelIndex + 1] < threshold
        || mask[topOffset + x] < threshold
        || mask[bottomOffset + x] < threshold;

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
    const width = YOLO_INPUT_SIZE;
    const height = YOLO_INPUT_SIZE;

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
    const planeSize = width * height;
    const inputData = new Float32Array(3 * planeSize);

    for (let index = 0; index < planeSize; index += 1) {
      const pixelIndex = index * 4;
      inputData[index] = pixels[pixelIndex] * INV_255;
      inputData[planeSize + index] = pixels[pixelIndex + 1] * INV_255;
      inputData[planeSize * 2 + index] = pixels[pixelIndex + 2] * INV_255;
    }

    const inputTensor = new Tensor('float32', inputData, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);
    // const inputName = session.inputNames[0]; // images
    const feeds = { images: inputTensor };

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
  const inputSize = YOLO_INPUT_SIZE; // YOLO26 模型输入尺寸

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
      const coeffBaseIndex = baseIndex + 6
      const maskX1 = Math.max(0, Math.floor((x1 / originalWidth) * YOLO_PROTO_WIDTH))
      const maskY1 = Math.max(0, Math.floor((y1 / originalHeight) * YOLO_PROTO_HEIGHT))
      const maskX2 = Math.min(YOLO_PROTO_WIDTH, Math.ceil((x2 / originalWidth) * YOLO_PROTO_WIDTH))
      const maskY2 = Math.min(YOLO_PROTO_HEIGHT, Math.ceil((y2 / originalHeight) * YOLO_PROTO_HEIGHT))
      const croppedMaskWidth = Math.max(1, maskX2 - maskX1)
      const croppedMaskHeight = Math.max(1, maskY2 - maskY1)
      const boxMask = new Float32Array(croppedMaskWidth * croppedMaskHeight)

      for (let maskY = 0; maskY < croppedMaskHeight; maskY += 1) {
        const protoY = maskY1 + maskY
        for (let maskX = 0; maskX < croppedMaskWidth; maskX += 1) {
          const protoX = maskX1 + maskX
          let sum = 0
          for (let channel = 0; channel < YOLO_MASK_CHANNELS; channel += 1) {
            const protoIndex = channel * YOLO_PROTO_HEIGHT * YOLO_PROTO_WIDTH + protoY * YOLO_PROTO_WIDTH + protoX
            sum += flatOutput[coeffBaseIndex + channel] * proto[protoIndex]
          }
          boxMask[maskY * croppedMaskWidth + maskX] = 1 / (1 + Math.exp(-sum))
        }
      }

      // 3. 将mask缩放到实际检测框大小（可选）
      const actualWidth = Math.max(1, Math.round(x2 - x1))
      const actualHeight = Math.max(1, Math.round(y2 - y1))
      const scaledMask = resizeMask(boxMask, croppedMaskWidth, croppedMaskHeight, actualWidth, actualHeight)

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
  if (fromWidth <= 0 || fromHeight <= 0) {
    return new Float32Array(toWidth * toHeight)
  }

  const output = new Float32Array(toWidth * toHeight)
  const x1Cache = new Int32Array(toWidth)
  const x2Cache = new Int32Array(toWidth)
  const xWeightCache = new Float32Array(toWidth)
  const y1Cache = new Int32Array(toHeight)
  const y2Cache = new Int32Array(toHeight)
  const yWeightCache = new Float32Array(toHeight)

  for (let x = 0; x < toWidth; x += 1) {
    const srcX = (x / toWidth) * fromWidth
    const leftX = Math.floor(srcX)
    x1Cache[x] = leftX
    x2Cache[x] = Math.min(leftX + 1, fromWidth - 1)
    xWeightCache[x] = srcX - leftX
  }

  for (let y = 0; y < toHeight; y += 1) {
    const srcY = (y / toHeight) * fromHeight
    const topY = Math.floor(srcY)
    y1Cache[y] = topY
    y2Cache[y] = Math.min(topY + 1, fromHeight - 1)
    yWeightCache[y] = srcY - topY
  }

  for (let y = 0; y < toHeight; y++) {
    const y1 = y1Cache[y]
    const y2 = y2Cache[y]
    const yWeight = yWeightCache[y]
    for (let x = 0; x < toWidth; x++) {
      const x1 = x1Cache[x]
      const x2 = x2Cache[x]
      const xWeight = xWeightCache[x]

      const val = mask[y1 * fromWidth + x1] * (1 - xWeight) * (1 - yWeight)
        + mask[y1 * fromWidth + x2] * xWeight * (1 - yWeight)
        + mask[y2 * fromWidth + x1] * (1 - xWeight) * yWeight
        + mask[y2 * fromWidth + x2] * xWeight * yWeight

      output[y * toWidth + x] = val
    }
  }

  return output
}
const LIMIT_SIDE_LEN = 960;
const DEFAULT_REC_IMAGE_HEIGHT = 48;
const DET_MEAN = [0.485, 0.456, 0.406];
const DET_STD = [0.229, 0.224, 0.225];
const REC_MEAN = [0.5, 0.5, 0.5];
const REC_STD = [0.5, 0.5, 0.5];
const DET_THRESHOLD = 0.28;
const INV_255 = 1 / 255;

export type PolygonPoint = [number, number];

export interface PPOcrRuntime {
  detSession: any;
  recSession: any;
  recImageHeight: number;
  dictionary: string[];
  Tensor: any;
}

export interface PPOcrRecognizeOptions {
  detThreshold?: number;
  limitSideLen?: number;
  includePreparedImage?: boolean;
}

export interface PPOcrDebugImage {
  width: number;
  height: number;
  data: number[];
}

export interface PPOcrDebugLine {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface PPOcrDebugResult {
  text: string;
  imageWidth: number;
  imageHeight: number;
  detectWidth: number;
  detectHeight: number;
  lines: PPOcrDebugLine[];
  preparedImage?: PPOcrDebugImage | null;
}

interface PPOcrCreateOptions {
  detModelUrl: string;
  recModelUrl: string;
  dictUrl: string;
  executionProviders: string[];
  wasmConfig?: {
    simd?: boolean;
    numThreads?: number;
    wasmPaths?: string | Record<string, string>;
  };
}

interface DetectInput {
  canvas: OffscreenCanvas;
  tensor: Float32Array;
  width: number;
  height: number;
}

interface RecognitionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  img: ImageData;
}

interface PPOcrPipelineResult {
  imageData: ImageData;
  detInput: DetectInput;
  detBoxes: RecognitionBox[];
  decodedLines: Array<{ text: string; mean: number }>;
}

function resolveRecognitionInputHeight(recSession: any): number {
  const inputName = recSession?.inputNames?.[0];
  const inputMetadata = recSession?.inputMetadata;
  const inputInfo = Array.isArray(inputMetadata)
    ? inputMetadata.find((item) => item?.name === inputName)
    : inputMetadata?.[inputName];
  const dimensions = inputInfo?.dimensions ?? inputInfo?.shape;

  if (!Array.isArray(dimensions)) {
    return DEFAULT_REC_IMAGE_HEIGHT;
  }

  const imageHeight = dimensions[2];
  return Number.isInteger(imageHeight) && imageHeight > 0 ? imageHeight : DEFAULT_REC_IMAGE_HEIGHT;
}

function createCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(width, height);
}

function get2dContext(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('无法获取 2D canvas context');
  }
  return context;
}

function imageDataToCanvas(imageData: ImageData): OffscreenCanvas {
  const canvas = createCanvas(imageData.width, imageData.height);
  const context = get2dContext(canvas);
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function serializeImageData(imageData: ImageData): PPOcrDebugImage {
  return {
    width: imageData.width,
    height: imageData.height,
    data: Array.from(imageData.data),
  };
}

function resizeImageData(imageData: ImageData, width: number, height: number): ImageData {
  const source = imageDataToCanvas(imageData);
  const canvas = createCanvas(width, height);
  const context = get2dContext(canvas);
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function normalizeDetSize(width: number, height: number, limitSideLen: number = LIMIT_SIDE_LEN) {
  let ratio = 1;
  if (Math.max(width, height) > limitSideLen) {
    ratio = limitSideLen / Math.max(width, height);
  }

  const resizedHeight = Math.max(Math.round((height * ratio) / 32) * 32, 32);
  const resizedWidth = Math.max(Math.round((width * ratio) / 32) * 32, 32);
  return { resizedWidth, resizedHeight };
}

function imageDataToCHW(imageData: ImageData, mean: number[], std: number[]): Float32Array {
  const { width, height, data } = imageData;
  const tensor = new Float32Array(width * height * 3);
  const planeSize = width * height;

  for (let index = 0; index < planeSize; index += 1) {
    const pixelOffset = index * 4;
    const red = data[pixelOffset] * INV_255;
    const green = data[pixelOffset + 1] * INV_255;
    const blue = data[pixelOffset + 2] * INV_255;
    tensor[index] = (blue - mean[2]) / std[2];
    tensor[planeSize + index] = (green - mean[1]) / std[1];
    tensor[planeSize * 2 + index] = (red - mean[0]) / std[0];
  }

  return tensor;
}

function cropFromCanvas(
  context: OffscreenCanvasRenderingContext2D,
  box: Omit<RecognitionBox, 'img'>,
): ImageData {
  return context.getImageData(box.x, box.y, box.width, box.height);
}

function sortBoxes(boxes: RecognitionBox[]): RecognitionBox[] {
  return [...boxes].sort((left, right) => {
    const rowDelta = left.y - right.y;
    if (Math.abs(rowDelta) > 12) {
      return rowDelta;
    }
    return left.x - right.x;
  });
}

function extractBoxesFromMap(
  probabilityMap: ArrayLike<number>,
  width: number,
  height: number,
  sourceCanvas: OffscreenCanvas,
  threshold: number = DET_THRESHOLD,
): RecognitionBox[] {
  const visited = new Uint8Array(width * height);
  const boxes: RecognitionBox[] = [];
  const visitQueueX = new Int32Array(width * height);
  const visitQueueY = new Int32Array(width * height);
  const sourceContext = get2dContext(sourceCanvas);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index] || probabilityMap[index] < threshold) {
        continue;
      }

      let head = 0;
      let tail = 1;
      let pixelCount = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      visited[index] = 1;
      visitQueueX[0] = x;
      visitQueueY[0] = y;

      while (head < tail) {
        const currentX = visitQueueX[head];
        const currentY = visitQueueY[head];
        head += 1;
        pixelCount += 1;

        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);

        const leftX = currentX - 1;
        if (leftX >= 0) {
          const leftIndex = currentY * width + leftX;
          if (!visited[leftIndex] && probabilityMap[leftIndex] >= threshold) {
            visited[leftIndex] = 1;
            visitQueueX[tail] = leftX;
            visitQueueY[tail] = currentY;
            tail += 1;
          }
        }

        const rightX = currentX + 1;
        if (rightX < width) {
          const rightIndex = currentY * width + rightX;
          if (!visited[rightIndex] && probabilityMap[rightIndex] >= threshold) {
            visited[rightIndex] = 1;
            visitQueueX[tail] = rightX;
            visitQueueY[tail] = currentY;
            tail += 1;
          }
        }

        const topY = currentY - 1;
        if (topY >= 0) {
          const topIndex = topY * width + currentX;
          if (!visited[topIndex] && probabilityMap[topIndex] >= threshold) {
            visited[topIndex] = 1;
            visitQueueX[tail] = currentX;
            visitQueueY[tail] = topY;
            tail += 1;
          }
        }

        const bottomY = currentY + 1;
        if (bottomY < height) {
          const bottomIndex = bottomY * width + currentX;
          if (!visited[bottomIndex] && probabilityMap[bottomIndex] >= threshold) {
            visited[bottomIndex] = 1;
            visitQueueX[tail] = currentX;
            visitQueueY[tail] = bottomY;
            tail += 1;
          }
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      if (componentWidth < 8 || componentHeight < 8 || pixelCount < 24) {
        continue;
      }

      const paddingX = Math.max(6, Math.round(componentWidth * 0.12));
      const paddingY = Math.max(6, Math.round(componentHeight * 0.2));
      const paddedX = Math.max(0, minX - paddingX);
      const paddedY = Math.max(0, minY - paddingY);
      const paddedRight = Math.min(width, maxX + paddingX + 1);
      const paddedBottom = Math.min(height, maxY + paddingY + 1);
      const box = {
        x: paddedX,
        y: paddedY,
        width: paddedRight - paddedX,
        height: paddedBottom - paddedY,
      };

      if (box.width / box.height < 0.6) {
        continue;
      }

      boxes.push({
        ...box,
        img: cropFromCanvas(sourceContext, box),
      });
    }
  }

  if (!boxes.length) {
    const fallback = {
      x: 0,
      y: 0,
      width,
      height,
    };
    return [{
      ...fallback,
      img: cropFromCanvas(sourceContext, fallback),
    }];
  }

  return sortBoxes(boxes);
}

function buildDetectInput(imageData: ImageData, limitSideLen: number = LIMIT_SIDE_LEN): DetectInput {
  const { resizedWidth, resizedHeight } = normalizeDetSize(imageData.width, imageData.height, limitSideLen);
  const resized = resizeImageData(imageData, resizedWidth, resizedHeight);
  const canvas = imageDataToCanvas(resized);
  const tensor = imageDataToCHW(resized, DET_MEAN, DET_STD);
  return {
    canvas,
    tensor,
    width: resizedWidth,
    height: resizedHeight,
  };
}

function prepareRecognitionBatch(boxes: RecognitionBox[], recImageHeight: number) {
  let maxWhRatio = 1;
  for (const box of boxes) {
    maxWhRatio = Math.max(maxWhRatio, box.img.width / box.img.height);
  }
  const targetWidth = Math.max(32, Math.floor(recImageHeight * maxWhRatio));
  const batch = new Float32Array(boxes.length * 3 * recImageHeight * targetWidth);
  const singleImageSize = 3 * recImageHeight * targetWidth;

  boxes.forEach((box, boxIndex) => {
    const ratio = box.img.width / box.img.height;
    const resizedWidth = Math.min(targetWidth, Math.max(1, Math.ceil(recImageHeight * ratio)));
    const resizedImage = resizeImageData(box.img, resizedWidth, recImageHeight);
    const canvas = createCanvas(targetWidth, recImageHeight);
    const context = get2dContext(canvas);
    context.putImageData(resizedImage, 0, 0);
    const normalized = imageDataToCHW(
      context.getImageData(0, 0, targetWidth, recImageHeight),
      REC_MEAN,
      REC_STD,
    );
    batch.set(normalized, boxIndex * singleImageSize);
  });

  return {
    data: batch,
    imgH: recImageHeight,
    imgW: targetWidth,
  };
}

function decodeRecognition(outputTensor: any, dictionary: string[]) {
  const { data, dims } = outputTensor;
  const [batchSize, timeSteps, classCount] = dims;
  const lines: Array<{ text: string; mean: number }> = [];

  for (let batchIndex = 0; batchIndex < batchSize; batchIndex += 1) {
    const charList: string[] = [];
    const confidenceList: number[] = [];
    let previousClass = 0;

    for (let timeStep = 0; timeStep < timeSteps; timeStep += 1) {
      let bestClass = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      const offset = (batchIndex * timeSteps + timeStep) * classCount;

      for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
        const score = data[offset + classIndex];
        if (score > bestScore) {
          bestScore = score;
          bestClass = classIndex;
        }
      }

      if (bestClass === 0) {
        previousClass = 0;
        continue;
      }

      if (bestClass === previousClass) {
        continue;
      }

      charList.push(dictionary[bestClass - 1] ?? '');
      confidenceList.push(bestScore);
      previousClass = bestClass;
    }

    const text = charList.join('').trim();
    const mean = confidenceList.length
      ? confidenceList.reduce((sum, value) => sum + value, 0) / confidenceList.length
      : 0;

    lines.push({ text, mean });
  }

  return lines;
}

async function loadDictionary(dictUrl: string): Promise<string[]> {
  const response = await fetch(dictUrl);
  if (!response.ok) {
    throw new Error(`字典加载失败: ${response.status}`);
  }
  const content = await response.text();
  return content
    .split(/\r?\n/u)
    .map((line, index) => (index === 0 ? line.replace(/^\uFEFF/u, '') : line))
    .filter(Boolean);
}

function rotateToTopLeft(points: PolygonPoint[]): PolygonPoint[] {
  let startIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const [x, y] = points[index];
    const score = x + y;
    if (score < bestScore) {
      bestScore = score;
      startIndex = index;
    }
  }
  return [...points.slice(startIndex), ...points.slice(0, startIndex)];
}

function orderQuadPoints(points: PolygonPoint[]): PolygonPoint[] {
  const centerX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const centerY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const ordered = [...points].sort((left, right) => {
    const leftAngle = Math.atan2(left[1] - centerY, left[0] - centerX);
    const rightAngle = Math.atan2(right[1] - centerY, right[0] - centerX);
    return leftAngle - rightAngle;
  });
  return rotateToTopLeft(ordered);
}

function getDistance(left: PolygonPoint, right: PolygonPoint): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < 1e-8) {
      throw new Error('透视矩阵求解失败');
    }

    [augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]];

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }
      const factor = augmented[row][pivot];
      if (factor === 0) {
        continue;
      }
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function computeHomography(source: PolygonPoint[], target: PolygonPoint[]): number[] {
  const matrix: number[][] = [];
  const values: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    const [sourceX, sourceY] = source[index];
    const [targetX, targetY] = target[index];

    matrix.push([sourceX, sourceY, 1, 0, 0, 0, -sourceX * targetX, -sourceY * targetX]);
    values.push(targetX);
    matrix.push([0, 0, 0, sourceX, sourceY, 1, -sourceX * targetY, -sourceY * targetY]);
    values.push(targetY);
  }

  const [a, b, c, d, e, f, g, h] = solveLinearSystem(matrix, values);
  return [a, b, c, d, e, f, g, h, 1];
}

function applyHomography(matrix: number[], x: number, y: number): PolygonPoint {
  const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
  return [
    (matrix[0] * x + matrix[1] * y + matrix[2]) / denominator,
    (matrix[3] * x + matrix[4] * y + matrix[5]) / denominator,
  ];
}

function sampleBilinear(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const clampedX = Math.max(0, Math.min(imageData.width - 1, x));
  const clampedY = Math.max(0, Math.min(imageData.height - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(x0 + 1, imageData.width - 1);
  const y1 = Math.min(y0 + 1, imageData.height - 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;
  const data = imageData.data;

  const readPixel = (pixelX: number, pixelY: number, channel: number) =>
    data[(pixelY * imageData.width + pixelX) * 4 + channel];

  const channels: [number, number, number, number] = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel += 1) {
    const top = readPixel(x0, y0, channel) * (1 - dx) + readPixel(x1, y0, channel) * dx;
    const bottom = readPixel(x0, y1, channel) * (1 - dx) + readPixel(x1, y1, channel) * dx;
    channels[channel] = top * (1 - dy) + bottom * dy;
  }

  return channels;
}

function warpPerspective(imageData: ImageData, polygon: PolygonPoint[]): ImageData {
  const ordered = orderQuadPoints(polygon);
  const topWidth = getDistance(ordered[0], ordered[1]);
  const bottomWidth = getDistance(ordered[3], ordered[2]);
  const leftHeight = getDistance(ordered[0], ordered[3]);
  const rightHeight = getDistance(ordered[1], ordered[2]);
  const targetWidth = Math.max(32, Math.round(Math.max(topWidth, bottomWidth)));
  const targetHeight = Math.max(32, Math.round(Math.max(leftHeight, rightHeight)));
  const outputCanvas = createCanvas(targetWidth, targetHeight);
  const outputContext = get2dContext(outputCanvas);
  const output = outputContext.createImageData(targetWidth, targetHeight);
  const rectangle: PolygonPoint[] = [
    [0, 0],
    [targetWidth - 1, 0],
    [targetWidth - 1, targetHeight - 1],
    [0, targetHeight - 1],
  ];
  const matrix = computeHomography(rectangle, ordered);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const [sourceX, sourceY] = applyHomography(matrix, x, y);
      const [red, green, blue, alpha] = sampleBilinear(imageData, sourceX, sourceY);
      const offset = (y * targetWidth + x) * 4;
      output.data[offset] = red;
      output.data[offset + 1] = green;
      output.data[offset + 2] = blue;
      output.data[offset + 3] = alpha;
    }
  }

  return output;
}

function normalizePolygon(polygon?: number[][] | null): PolygonPoint[] {
  if (!polygon || polygon.length < 4) {
    return [];
  }

  const normalized: PolygonPoint[] = [];
  for (const point of polygon) {
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    normalized.push([x, y]);
  }

  return normalized.slice(0, 4);
}

async function decodeImageData(imageInput: Uint8Array): Promise<ImageData> {
  // @ts-ignore
  const blob = new Blob([imageInput], { type: 'image/png' });
  const imageBitmap = await createImageBitmap(blob);
  const canvas = createCanvas(imageBitmap.width, imageBitmap.height);
  const context = get2dContext(canvas);
  context.drawImage(imageBitmap, 0, 0);
  imageBitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function cropByBounds(imageData: ImageData, polygon: PolygonPoint[]): ImageData {
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(([, y]) => y))));
  const maxX = Math.min(imageData.width, Math.ceil(Math.max(...polygon.map(([x]) => x))));
  const maxY = Math.min(imageData.height, Math.ceil(Math.max(...polygon.map(([, y]) => y))));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const canvas = imageDataToCanvas(imageData);
  const context = get2dContext(canvas);
  return context.getImageData(minX, minY, width, height);
}

function prepareOcrImage(imageData: ImageData, polygon?: number[][] | null): ImageData {
  const normalizedPolygon = normalizePolygon(polygon);
  if (normalizedPolygon.length === 4) {
    return warpPerspective(imageData, normalizedPolygon);
  }
  if (normalizedPolygon.length > 0) {
    return cropByBounds(imageData, normalizedPolygon);
  }
  return imageData;
}

export async function createPPOcrRuntime(ort: any, options: PPOcrCreateOptions): Promise<PPOcrRuntime> {
  if (options.wasmConfig) {
    ort.env.wasm.simd = options.wasmConfig.simd ?? ort.env.wasm.simd;
    ort.env.wasm.numThreads = options.wasmConfig.numThreads ?? ort.env.wasm.numThreads;
    if (options.wasmConfig.wasmPaths) {
      ort.env.wasm.wasmPaths = options.wasmConfig.wasmPaths;
    }
  }

  const [dictionary, detSession, recSession] = await Promise.all([
    loadDictionary(options.dictUrl),
    ort.InferenceSession.create(options.detModelUrl, {
      executionProviders: options.executionProviders,
    }),
    ort.InferenceSession.create(options.recModelUrl, {
      executionProviders: options.executionProviders,
    }),
  ]);

  return {
    detSession,
    recSession,
    recImageHeight: resolveRecognitionInputHeight(recSession),
    dictionary,
    Tensor: ort.Tensor,
  };
}

export async function recognizeTextFromImageBytes(
  imageInput: Uint8Array,
  runtime: PPOcrRuntime,
  polygon?: number[][] | null,
  options: PPOcrRecognizeOptions = {},
): Promise<string> {
  const { decodedLines } = await runPPOcrPipeline(imageInput, runtime, polygon, options);
  const lines = decodedLines
    .map((item) => item.text.trim())
    .filter(Boolean);

  return lines.join(' ').trim();
}

export async function recognizeTextDebugFromImageBytes(
  imageInput: Uint8Array,
  runtime: PPOcrRuntime,
  polygon?: number[][] | null,
  options: PPOcrRecognizeOptions = {},
): Promise<PPOcrDebugResult> {
  const { imageData, detInput, detBoxes, decodedLines } = await runPPOcrPipeline(
    imageInput,
    runtime,
    polygon,
    options,
  );
  const lines = detBoxes.map((box, index) => ({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    text: decodedLines[index]?.text.trim() ?? '',
    confidence: decodedLines[index]?.mean ?? 0,
  }));

  return {
    text: lines.map((line) => line.text).filter(Boolean).join(' ').trim(),
    imageWidth: imageData.width,
    imageHeight: imageData.height,
    detectWidth: detInput.width,
    detectHeight: detInput.height,
    lines,
    preparedImage: options.includePreparedImage ? serializeImageData(imageData) : null,
  };
}

async function runPPOcrPipeline(
  imageInput: Uint8Array,
  runtime: PPOcrRuntime,
  polygon?: number[][] | null,
  options: PPOcrRecognizeOptions = {},
): Promise<PPOcrPipelineResult> {
  const imageData = prepareOcrImage(await decodeImageData(imageInput), polygon);
  const detInput = buildDetectInput(imageData, options.limitSideLen ?? LIMIT_SIDE_LEN);
  const detTensor = new runtime.Tensor('float32', detInput.tensor, [1, 3, detInput.height, detInput.width]);
  const detFeeds = { [runtime.detSession.inputNames[0]]: detTensor };
  const detResults = await runtime.detSession.run(detFeeds);
  const detOutputName = runtime.detSession.outputNames[0];
  const detOutput = detResults[detOutputName];
  const detBoxes = extractBoxesFromMap(
    detOutput.data,
    detOutput.dims[3],
    detOutput.dims[2],
    detInput.canvas,
    options.detThreshold ?? DET_THRESHOLD,
  );
  const recInput = prepareRecognitionBatch(detBoxes, runtime.recImageHeight);
  const recTensor = new runtime.Tensor('float32', recInput.data, [detBoxes.length, 3, recInput.imgH, recInput.imgW]);
  const recFeeds = { [runtime.recSession.inputNames[0]]: recTensor };
  const recResults = await runtime.recSession.run(recFeeds);
  const recOutputName = runtime.recSession.outputNames[0];
  const recOutput = recResults[recOutputName];
  const decodedLines = decodeRecognition(recOutput, runtime.dictionary);

  return {
    imageData,
    detInput,
    detBoxes,
    decodedLines,
  };
}

// 下面的函数是为了调试方便，将 ImageData 转换为 Base64 字符串，以便在控制台查看图像内容
// function imageDataToBase64(imageData: ImageData): string {
//   const canvas = document.createElement('canvas');
//   const ctx = canvas.getContext('2d');
  
//   canvas.width = imageData.width;
//   canvas.height = imageData.height;
  
//   ctx?.putImageData(imageData, 0, 0);
  
//   return canvas.toDataURL();
// }
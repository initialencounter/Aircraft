import * as ort from "onnxruntime-web/wasm";
import { SegmentResult } from "aircraft-rs";
const yoloClasses = ['9', '9A', 'bty', 'CAO']

export default defineUnlistedScript(() => {
  // 通过 background 代理获取 enableLabelCheck
  chrome.runtime.sendMessage({ action: 'getEnableLabelCheck' }).then((result) => {
    if (result.enableLabelCheck === false) {
      console.log('未启用标签检测, 不加载 YOLO 模型')
      return;
    }
  }).catch((error) => {
    console.error('获取 enableLabelCheck 失败:', error)
  })
  let session: ort.InferenceSession;

  (async () => {
    try {
      const modelUrl = chrome.runtime.getURL('segment.onnx');
      // 配置 session 选项以抑制警告
      session = await ort.InferenceSession.create(modelUrl, {
        logSeverityLevel: 3, // 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal
        logVerbosityLevel: 0
      });
      console.log("Model loaded successfully");
      chrome.runtime.sendMessage({ action: 'madeModel', input: session.inputNames });
    }
    catch (e) {
      chrome.runtime.sendMessage({ action: 'madeModel', input: "Model Import Error" });
    }

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action == "yolo-inference") {
        console.log("Received yolo-inference request");
        // 使用 Promise 处理异步操作
        (async () => {
          try {
            // 将数组转换回 Uint8Array
            const input = Array.isArray(request.input)
              ? new Uint8Array(request.input)
              : request.input;
            let result = await predict(yoloClasses, session, input);
            sendResponse({ result });
          } catch (e) {
            console.error("YOLO inference error:", e);
            sendResponse({ 'error': String(e) });
          }
        })();
        return true; // 保持消息通道开放，等待异步响应
      }
    });
  })();

  async function predict(yoloClasses: string[], session: ort.InferenceSession, imageInput: Uint8Array | string) {
    let rowImageWidth: number;
    let rowImageHeight: number;
    const width = 640;
    const height = 640;

    // 创建 Canvas 来处理图片
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    if (imageInput instanceof Uint8Array) {
      // 直接从 Uint8Array 创建 ImageBitmap
      // @ts-ignore - Uint8Array can be used in Blob constructor
      const blob = new Blob([imageInput], { type: 'image/png' });
      const imageBitmap = await createImageBitmap(blob);

      rowImageWidth = imageBitmap.width;
      rowImageHeight = imageBitmap.height;

      // 在 Canvas 上绘制缩放后的图片
      ctx.drawImage(imageBitmap, 0, 0, width, height);

      // 关闭 ImageBitmap 释放资源
      imageBitmap.close();
    } else {
      // 使用 Image 对象加载 URL
      const img = new Image();
      img.src = imageInput;

      // 等待图片加载完成
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      rowImageWidth = img.width;
      rowImageHeight = img.height;

      // 在 Canvas 上绘制缩放后的图片
      ctx.drawImage(img, 0, 0, width, height);
    }

    // 获取图片数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data; // Uint8ClampedArray，包含 RGBA 数据

    // 将图片数据转换为 Float32Array
    const inputData = new Float32Array(1 * 3 * width * height);

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixelIndex = (i * width + j) * 4; // 每个像素有 4 个值（RGBA）
        const r = pixels[pixelIndex] / 255.0;     // R
        const g = pixels[pixelIndex + 1] / 255.0; // G
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

  /**
   * Function used to convert RAW output from YOLOv8-Segment to an array of detected objects with masks.
   * Each object contains the bounding box, object type, probability, and segmentation mask
   * @param output0 Detection output of YOLOv8-Segment network (boxes + classes + mask coefficients)
   * @param output1 Mask prototypes output [1, 32, 160, 160]
   * @param img_width Width of original image
   * @param img_height Height of original image
   * @param yolo_classes Array of class names
   * @returns Array of detected objects with masks [[x1,y1,x2,y2,object_type,probability,mask],...]
   */
  function process_output(output0: number[], output1: number[], img_width: number, img_height: number, yolo_classes: string[]): SegmentResult[] {
    const num_classes = yolo_classes.length;
    const mask_dim = 32; // mask coefficients dimension

    // output0 shape: [1, 4+num_classes+32, 8400] -> transposed to [8400, 4+num_classes+32]
    // output1 shape: [1, 32, 160, 160]

    // 提取 mask prototypes: [32, 160, 160] -> reshape to [32, 25600]
    const mask_prototypes: number[][] = [];
    for (let c = 0; c < 32; c++) {
      const channel: number[] = [];
      for (let i = 0; i < 160 * 160; i++) {
        channel.push(output1[c * 160 * 160 + i]);
      }
      mask_prototypes.push(channel);
    }

    let boxes: Array<[number, number, number, number, string, number, number[]]> = [];

    for (let index = 0; index < 8400; index++) {
      // 提取类别概率
      const [class_id, prob] = [...Array(num_classes).keys()]
        .map((col) => [col, output0[8400 * (col + 4) + index]])
        .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);

      if (prob < 0.25) {
        continue;
      }

      const label = yolo_classes[class_id];
      const xc = output0[index];
      const yc = output0[8400 + index];
      const w = output0[2 * 8400 + index];
      const h = output0[3 * 8400 + index];
      const x1 = ((xc - w / 2) / 640) * img_width;
      const y1 = ((yc - h / 2) / 640) * img_height;
      const x2 = ((xc + w / 2) / 640) * img_width;
      const y2 = ((yc + h / 2) / 640) * img_height;

      // 提取 mask coefficients (32个系数)
      const mask_coeffs: number[] = [];
      for (let i = 0; i < mask_dim; i++) {
        mask_coeffs.push(output0[8400 * (4 + num_classes + i) + index]);
      }

      boxes.push([x1, y1, x2, y2, label, prob, mask_coeffs]);
    }

    boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
    const result = [];

    while (boxes.length > 0) {
      const currentBox = boxes[0];
      // 计算分割掩码: mask_coeffs @ mask_prototypes = [32] @ [32, 25600] = [25600] -> [160, 160]
      const mask = calculate_mask(currentBox[6], mask_prototypes, currentBox, img_width, img_height);
      result.push({
        x1: currentBox[0],
        y1: currentBox[1],
        x2: currentBox[2],
        y2: currentBox[3],
        label: currentBox[4],
        confidence: currentBox[5],
        mask: mask
      });
      boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
    }

    return result;
  }

  /**
   * Calculate segmentation mask for a detected object
   * @param mask_coeffs Mask coefficients [32]
   * @param mask_prototypes Mask prototypes [32, 25600]
   * @param box Bounding box [x1, y1, x2, y2, label, prob, coeffs]
   * @param img_width Original image width
   * @param img_height Original image height
   * @returns Processed mask as 2D array
   */
  function calculate_mask(
    mask_coeffs: number[],
    mask_prototypes: number[][],
    box: [number, number, number, number, string, number, number[]],
    img_width: number,
    img_height: number
  ): number[][] {
    const [x1, y1, x2, y2] = box;

    // 计算 mask: coeffs @ prototypes
    const mask_160x160: number[] = new Array(160 * 160).fill(0);
    for (let i = 0; i < 160 * 160; i++) {
      let sum = 0;
      for (let j = 0; j < 32; j++) {
        sum += mask_coeffs[j] * mask_prototypes[j][i];
      }
      // Sigmoid activation
      mask_160x160[i] = 1 / (1 + Math.exp(-sum));
    }

    // 裁剪到边界框区域并调整大小
    const crop_x1 = Math.round((x1 / img_width) * 160);
    const crop_y1 = Math.round((y1 / img_height) * 160);
    const crop_x2 = Math.round((x2 / img_width) * 160);
    const crop_y2 = Math.round((y2 / img_height) * 160);

    const crop_w = Math.max(1, crop_x2 - crop_x1);
    const crop_h = Math.max(1, crop_y2 - crop_y1);

    // 裁剪掩码
    const cropped_mask: number[][] = [];
    for (let y = crop_y1; y < crop_y2 && y < 160; y++) {
      const row: number[] = [];
      for (let x = crop_x1; x < crop_x2 && x < 160; x++) {
        if (y >= 0 && x >= 0) {
          row.push(mask_160x160[y * 160 + x] > 0.5 ? 255 : 0);
        }
      }
      if (row.length > 0) cropped_mask.push(row);
    }

    // 调整掩码大小到原始边界框尺寸
    const target_w = Math.round(x2 - x1);
    const target_h = Math.round(y2 - y1);

    if (target_w <= 0 || target_h <= 0 || cropped_mask.length === 0) {
      return [];
    }

    const resized_mask: number[][] = [];
    for (let y = 0; y < target_h; y++) {
      const row: number[] = [];
      for (let x = 0; x < target_w; x++) {
        const src_y = Math.min(Math.floor((y / target_h) * cropped_mask.length), cropped_mask.length - 1);
        const src_x = Math.min(Math.floor((x / target_w) * cropped_mask[0].length), cropped_mask[0].length - 1);
        row.push(cropped_mask[src_y][src_x]);
      }
      resized_mask.push(row);
    }

    return resized_mask;
  }

  /**
   * Function calculates "Intersection-over-union" coefficient for specified two boxes
   * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @returns Intersection over union ratio as a float number
   */
  function iou(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
    return intersection(box1, box2) / union(box1, box2);
  }

  /**
   * Function calculates union area of two boxes.
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @returns Area of the boxes union as a float number
   */
  function union(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
    return box1_area + box2_area - intersection(box1, box2);
  }

  /**
   * Function calculates intersection area of two boxes
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability,mask_coeffs]
   * @returns Area of intersection of the boxes as a float number
   */
  function intersection(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const x1 = Math.max(box1_x1, box2_x1);
    const y1 = Math.max(box1_y1, box2_y1);
    const x2 = Math.min(box1_x2, box2_x2);
    const y2 = Math.min(box1_y2, box2_y2);
    return (x2 - x1) * (y2 - y1);
  }
});

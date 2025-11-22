import * as ort from "onnxruntime-web";

const yoloClasses = ['9', '9A', 'BTY', 'CAO']

export default defineUnlistedScript(() => {
  let session: ort.InferenceSession;
  
  (async () => {
    try {
      const modelUrl = chrome.runtime.getURL('detect.onnx');
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

    chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
      if (request.action == "yolo-inference") {
        console.log("Received yolo-inference request");
        try {
          let result = await predict(yoloClasses, session, request['input']);
          console.log("Prediction result", result);
          sendResponse({ result });
        } catch (e) {
          sendResponse({ 'error': String(e) });
        }
      }
    });
  })();

  async function predict(yoloClasses: string[], session: ort.InferenceSession, imageUrl: string) {
    // 创建一个 Image 对象
    const img = new Image();
    img.src = imageUrl;
    
    // 等待图片加载完成
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const rowImageWidth = img.width;
    const rowImageHeight = img.height;
    const width = 640;
    const height = 640;

    // 创建 Canvas 来处理图片
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // 在 Canvas 上绘制缩放后的图片
    ctx.drawImage(img, 0, 0, width, height);
    
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
    return process_output(res['output0']['data'], rowImageWidth, rowImageHeight, yoloClasses)
  }

  type BoundingBox = [number, number, number, number, string, number];

  /**
   * Function used to convert RAW output from YOLOv8 to an array of detected objects.
   * Each object contain the bounding box of this object, the type of object and the probability
   * @param output Raw output of YOLOv8 network
   * @param img_width Width of original image
   * @param img_height Height of original image
   * @returns Array of detected objects in a format [[x1,y1,x2,y2,object_type,probability],..]
   */
  function process_output(output: number[], img_width: number, img_height: number, yolo_classes: string[]) {
    let boxes: Array<[number, number, number, number, string, number]> = [];
    for (let index = 0; index < 8400; index++) {
      const [class_id, prob] = [...Array(80).keys()]
        .map((col) => [col, output[8400 * (col + 4) + index]])
        .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);
      if (prob < 0.5) {
        continue;
      }
      const label = yolo_classes[class_id];
      const xc = output[index];
      const yc = output[8400 + index];
      const w = output[2 * 8400 + index];
      const h = output[3 * 8400 + index];
      const x1 = ((xc - w / 2) / 640) * img_width;
      const y1 = ((yc - h / 2) / 640) * img_height;
      const x2 = ((xc + w / 2) / 640) * img_width;
      const y2 = ((yc + h / 2) / 640) * img_height;
      boxes.push([x1, y1, x2, y2, label, prob]);
    }

    boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
    const result = [];
    while (boxes.length > 0) {
      result.push(boxes[0]);
      boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
    }
    return result;
  }

  /**
   * Function calculates "Intersection-over-union" coefficient for specified two boxes
   * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability]
   * @returns Intersection over union ratio as a float number
   */
  function iou(box1: BoundingBox, box2: BoundingBox) {
    return intersection(box1, box2) / union(box1, box2);
  }

  /**
   * Function calculates union area of two boxes.
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
   * @returns Area of the boxes union as a float number
   */
  function union(box1: BoundingBox, box2: BoundingBox) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
    return box1_area + box2_area - intersection(box1, box2);
  }

  /**
   * Function calculates intersection area of two boxes
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
   * @returns Area of intersection of the boxes as a float number
   */
  function intersection(box1: BoundingBox, box2: BoundingBox) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const x1 = Math.max(box1_x1, box2_x1);
    const y1 = Math.max(box1_y1, box2_y1);
    const x2 = Math.min(box1_x2, box2_x2);
    const y2 = Math.min(box1_y2, box2_y2);
    return (x2 - x1) * (y2 - y1);
  }
});

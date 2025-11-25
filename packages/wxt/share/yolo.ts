import { SegmentResult } from 'aircraft-rs';


export function process_output(output0: any, output1: any, img_width: number, img_height: number, yolo_classes: string[]): SegmentResult[] {
  const num_classes = yolo_classes.length;
  const mask_dim = 32;

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
    result.push({
      x1: currentBox[0],
      y1: currentBox[1],
      x2: currentBox[2],
      y2: currentBox[3],
      label: currentBox[4],
      confidence: currentBox[5],
      // mask: calculate_mask(currentBox[6], mask_prototypes, currentBox, img_width, img_height),
      mask: [] // 暂时不计算掩码以提高性能
    });
    boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
  }

  return result;
}

export function calculate_mask(
  mask_coeffs: number[],
  mask_prototypes: number[][],
  box: [number, number, number, number, string, number, number[]],
  img_width: number,
  img_height: number
): number[][] {
  const [x1, y1, x2, y2] = box;

  const mask_160x160: number[] = new Array(160 * 160).fill(0);
  for (let i = 0; i < 160 * 160; i++) {
    let sum = 0;
    for (let j = 0; j < 32; j++) {
      sum += mask_coeffs[j] * mask_prototypes[j][i];
    }
    mask_160x160[i] = 1 / (1 + Math.exp(-sum));
  }

  const crop_x1 = Math.round((x1 / img_width) * 160);
  const crop_y1 = Math.round((y1 / img_height) * 160);
  const crop_x2 = Math.round((x2 / img_width) * 160);
  const crop_y2 = Math.round((y2 / img_height) * 160);

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

export function iou(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
  return intersection(box1, box2) / union(box1, box2);
}

export function union(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
  const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
  return box1_area + box2_area - intersection(box1, box2);
}

export function intersection(box1: [number, number, number, number, string, number, number[]], box2: [number, number, number, number, string, number, number[]]) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const x1 = Math.max(box1_x1, box2_x1);
  const y1 = Math.max(box1_y1, box2_y1);
  const x2 = Math.min(box1_x2, box2_x2);
  const y2 = Math.min(box1_y2, box2_y2);
  return (x2 - x1) * (y2 - y1);
}
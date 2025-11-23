use image::{imageops::FilterType, GenericImage, GenericImageView, Rgba};
use lazy_static::lazy_static;
use ndarray::{s, Array, Array2, Axis, IxDyn};
use ort::{session::Session, value::Value};
use std::{sync::Mutex, vec};

use aircraft_types::yolo::SegmentResult;

lazy_static! {
    static ref MODEL: Mutex<Session> = {
        let model_data: &[u8] = include_bytes!("segment.onnx");
        let model = Session::builder()
            .unwrap()
            .commit_from_memory(model_data)
            .map_err(|e| format!("Failed to run model: {:?}", e))
            .unwrap();
        Mutex::new(model)
    };
}

pub fn detect_objects_on_image(buf: Vec<u8>) -> Vec<SegmentResult> {
    let (input, img_width, img_height) = prepare_input(buf);
    let outputs = run_model(input);
    return process_output(outputs, img_width, img_height);
}

pub fn prepare_input(buf: Vec<u8>) -> (Array<f32, IxDyn>, u32, u32) {
    let img = image::load_from_memory(&buf).unwrap();
    let (img_width, img_height) = (img.width(), img.height());
    let img = img.resize_exact(640, 640, FilterType::CatmullRom);
    let mut input = Array::zeros((1, 3, 640, 640)).into_dyn();
    for pixel in img.pixels() {
        let x = pixel.0 as usize;
        let y = pixel.1 as usize;
        let [r, g, b, _] = pixel.2 .0;
        input[[0, 0, y, x]] = (r as f32) / 255.0;
        input[[0, 1, y, x]] = (g as f32) / 255.0;
        input[[0, 2, y, x]] = (b as f32) / 255.0;
    }
    return (input, img_width, img_height);
}

fn run_model(input: Array<f32, IxDyn>) -> (Array<f32, IxDyn>, Array<f32, IxDyn>) {
    let mut model = MODEL.lock().unwrap();
    // Run YOLOv8 inference
    let input_value = Value::from_array(input).unwrap();
    let outputs = model.run(ort::inputs!["images" => &input_value]).unwrap();

    // 提取output0 (检测结果)
    let (shape0, data0) = outputs["output0"].try_extract_tensor::<f32>().unwrap();
    let dims0: Vec<usize> = shape0.as_ref().iter().map(|&d| d as usize).collect();
    let output0 = Array::from_shape_vec(IxDyn(&dims0), data0.to_vec())
        .unwrap()
        .t()
        .to_owned();

    // 提取output1 (分割掩码原型)
    let (shape1, data1) = outputs["output1"].try_extract_tensor::<f32>().unwrap();
    let dims1: Vec<usize> = shape1.as_ref().iter().map(|&d| d as usize).collect();
    let output1 = Array::from_shape_vec(IxDyn(&dims1), data1.to_vec())
        .unwrap()
        .t()
        .to_owned();

    return (output0, output1);
}

fn process_output(
    outputs: (Array<f32, IxDyn>, Array<f32, IxDyn>),
    img_width: u32,
    img_height: u32,
) -> Vec<SegmentResult> {
    let (output0, output1) = outputs;

    // 提取边界框和类别信息 (前36列: 4个bbox + 4个类别 + 32个mask系数)
    let num_classes = YOLO_CLASSES.len();
    let boxes_output = output0.slice(s![.., 0..(4 + num_classes), 0]).to_owned();

    // 提取mask系数 (接下来的32列)
    let masks_output2: Array2<f32> = output0
        .slice(s![.., (4 + num_classes)..(4 + num_classes + 32), 0])
        .to_owned();

    // 处理mask原型: output1的形状是 [1, 32, 160, 160]
    let masks_output: Array2<f32> = output1
        .slice(s![.., .., .., 0])
        .to_owned()
        .to_shape((160 * 160, 32))
        .unwrap()
        .to_owned()
        .permuted_axes([1, 0])
        .to_owned();

    // 计算最终的mask: [N, 32] x [32, 25600] = [N, 160, 160]
    let masks = masks_output2
        .dot(&masks_output)
        .to_shape((boxes_output.shape()[0], 160, 160))
        .unwrap()
        .to_owned();

    let mut boxes = Vec::new();
    for (index, row) in boxes_output.axis_iter(Axis(0)).enumerate() {
        let row: Vec<_> = row.iter().map(|x| *x).collect();
        let (class_id, prob) = row
            .iter()
            .skip(4)
            .enumerate()
            .map(|(index, value)| (index, *value))
            .reduce(|accum, row| if row.1 > accum.1 { row } else { accum })
            .unwrap();
        if prob < 0.5 {
            continue;
        }

        let mask: Array2<f32> = masks.slice(s![index, .., ..]).to_owned();
        let label = YOLO_CLASSES[class_id];
        let xc = row[0] / 640.0 * (img_width as f32);
        let yc = row[1] / 640.0 * (img_height as f32);
        let w = row[2] / 640.0 * (img_width as f32);
        let h = row[3] / 640.0 * (img_height as f32);
        let x1 = xc - w / 2.0;
        let x2 = xc + w / 2.0;
        let y1 = yc - h / 2.0;
        let y2 = yc + h / 2.0;

        boxes.push((x1, y1, x2, y2, label, prob, mask));
    }

    boxes.sort_by(|box1, box2| box2.5.total_cmp(&box1.5));
    let mut result = Vec::new();
    while boxes.len() > 0 {
        let current_box = boxes[0].clone();
        let processed_mask = process_mask(
            current_box.6.clone(),
            (current_box.0, current_box.1, current_box.2, current_box.3),
            img_width,
            img_height,
        );
        result.push(SegmentResult {
            x1: current_box.0 as f64,
            y1: current_box.1 as f64,
            x2: current_box.2 as f64,
            y2: current_box.3 as f64,
            label: current_box.4.to_string(),
            confidence: current_box.5 as f64,
            mask: processed_mask,
        });
        boxes = boxes
            .iter()
            .filter(|box1| iou(&boxes[0], box1) < 0.7)
            .map(|x| x.clone())
            .collect()
    }
    return result;
}

fn process_mask(
    mask: Array2<f32>,
    rect: (f32, f32, f32, f32),
    img_width: u32,
    img_height: u32,
) -> Vec<Vec<u8>> {
    let (x1, y1, x2, y2) = rect;
    let mut mask_img = image::DynamicImage::new_rgb8(161, 161);
    let mut index = 0.0;

    mask.for_each(|item| {
        let color = if *item > 0.0 {
            Rgba::<u8>([255, 255, 255, 1])
        } else {
            Rgba::<u8>([0, 0, 0, 1])
        };
        let y = f32::floor(index / 160.0);
        let x = index - y * 160.0;
        mask_img.put_pixel(x as u32, y as u32, color);
        index += 1.0;
    });

    mask_img = mask_img.crop(
        (x1 / img_width as f32 * 160.0).round() as u32,
        (y1 / img_height as f32 * 160.0).round() as u32,
        ((x2 - x1) / img_width as f32 * 160.0).round() as u32,
        ((y2 - y1) / img_height as f32 * 160.0).round() as u32,
    );

    mask_img = mask_img.resize_exact((x2 - x1) as u32, (y2 - y1) as u32, FilterType::Nearest);

    let mut result = vec![];
    for y in 0..(y2 - y1) as usize {
        let mut row = vec![];
        for x in 0..(x2 - x1) as usize {
            let color = mask_img.get_pixel(x as u32, y as u32);
            row.push(*color.0.iter().nth(0).unwrap());
        }
        result.push(row);
    }
    return result;
}

fn iou(
    box1: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
    box2: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
) -> f32 {
    return intersection(box1, box2) / union(box1, box2);
}

fn union(
    box1: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
    box2: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
) -> f32 {
    let (box1_x1, box1_y1, box1_x2, box1_y2, _, _, _) = *box1;
    let (box2_x1, box2_y1, box2_x2, box2_y2, _, _, _) = *box2;
    let box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
    let box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
    return box1_area + box2_area - intersection(box1, box2);
}

fn intersection(
    box1: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
    box2: &(f32, f32, f32, f32, &'static str, f32, Array2<f32>),
) -> f32 {
    let (box1_x1, box1_y1, box1_x2, box1_y2, _, _, _) = *box1;
    let (box2_x1, box2_y1, box2_x2, box2_y2, _, _, _) = *box2;
    let x1 = box1_x1.max(box2_x1);
    let y1 = box1_y1.max(box2_y1);
    let x2 = box1_x2.min(box2_x2);
    let y2 = box1_y2.min(box2_y2);
    return (x2 - x1) * (y2 - y1);
}

const YOLO_CLASSES: [&str; 4] = ["9", "9A", "bty", "CAO"];

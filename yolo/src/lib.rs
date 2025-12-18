use crate::segment::prepare_input;
use lazy_static::lazy_static;
use ndarray::{s, Array, Axis, IxDyn};
use ort::{session::Session, value::Value};
use std::{sync::Mutex, vec};

pub mod segment;

lazy_static! {
    static ref MODEL: Mutex<Session> = {
        let model_data: &[u8] = include_bytes!("best.onnx");
        let model = Session::builder()
            .unwrap()
            .commit_from_memory(model_data)
            .map_err(|e| format!("Failed to run model: {:?}", e))
            .unwrap();
        Mutex::new(model)
    };
}

pub fn detect_objects_on_image(buf: Vec<u8>) -> Vec<Vec<String>> {
    let (input, img_width, img_height) = prepare_input(buf);
    let output = run_model(input);
    process_output(output, img_width, img_height)
}

fn run_model(input: Array<f32, IxDyn>) -> Array<f32, IxDyn> {
    let mut model = MODEL.lock().unwrap();
    // Run YOLOv8 inference
    let input_value = Value::from_array(input).unwrap();
    let outputs = model.run(ort::inputs!["images" => &input_value]).unwrap();
    let (shape, data) = outputs["output0"].try_extract_tensor::<f32>().unwrap();
    let dims: Vec<usize> = shape.as_ref().iter().map(|&d| d as usize).collect();
    let output = Array::from_shape_vec(IxDyn(&dims), data.to_vec())
        .unwrap()
        .t()
        .to_owned();
    output
}

fn process_output(output: Array<f32, IxDyn>, img_width: u32, img_height: u32) -> Vec<Vec<String>> {
    let mut boxes = Vec::new();
    let output = output.slice(s![.., .., 0]);
    for row in output.axis_iter(Axis(0)) {
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
        let label = YOLO_CLASSES[class_id];
        let xc = row[0] / 640.0 * (img_width as f32);
        let yc = row[1] / 640.0 * (img_height as f32);
        let w = row[2] / 640.0 * (img_width as f32);
        let h = row[3] / 640.0 * (img_height as f32);
        let x1 = xc - w / 2.0;
        let x2 = xc + w / 2.0;
        let y1 = yc - h / 2.0;
        let y2 = yc + h / 2.0;
        boxes.push((x1, y1, x2, y2, label, prob));
    }

    boxes.sort_by(|box1, box2| box2.5.total_cmp(&box1.5));
    let mut result = Vec::new();
    while boxes.len() > 0 {
        result.push(boxes[0]);
        boxes = boxes
            .iter()
            .filter(|box1| iou(&boxes[0], box1) < 0.7)
            .map(|x| *x)
            .collect()
    }
    let array_data: Vec<Vec<String>> = result
        .into_iter()
        .map(|(a, b, c, d, e, f)| {
            vec![
                a.to_string(),
                b.to_string(),
                c.to_string(),
                d.to_string(),
                e.to_string(),
                f.to_string(),
            ]
        })
        .collect();
    array_data
}

fn iou(
    box1: &(f32, f32, f32, f32, &'static str, f32),
    box2: &(f32, f32, f32, f32, &'static str, f32),
) -> f32 {
    return intersection(box1, box2) / union(box1, box2);
}

fn union(
    box1: &(f32, f32, f32, f32, &'static str, f32),
    box2: &(f32, f32, f32, f32, &'static str, f32),
) -> f32 {
    let (box1_x1, box1_y1, box1_x2, box1_y2, _, _) = *box1;
    let (box2_x1, box2_y1, box2_x2, box2_y2, _, _) = *box2;
    let box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
    let box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
    return box1_area + box2_area - intersection(box1, box2);
}

fn intersection(
    box1: &(f32, f32, f32, f32, &'static str, f32),
    box2: &(f32, f32, f32, f32, &'static str, f32),
) -> f32 {
    let (box1_x1, box1_y1, box1_x2, box1_y2, _, _) = *box1;
    let (box2_x1, box2_y1, box2_x2, box2_y2, _, _) = *box2;
    let x1 = box1_x1.max(box2_x1);
    let y1 = box1_y1.max(box2_y1);
    let x2 = box1_x2.min(box2_x2);
    let y2 = box1_y2.min(box2_y2);
    (x2 - x1) * (y2 - y1)
}

const YOLO_CLASSES: [&str; 8] = ["9A", "3480", "CAO", "3481", "UN spec", "Blur", "9", "3091"];

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_detect_objects_on_image() {
        let img_data = fs::read(
            r"C:\Users\29115\yolov8\yolov11-seg\datasets\images\train\1716993798.633686.png",
        )
        .unwrap();
        let _result = detect_objects_on_image(img_data);
    }

    #[test]
    fn test_detect_objects_on_image2() {
        let img_data = fs::read(
            r"C:\Users\29115\yolov8\yolov11-seg\datasets\images\train\1716993798.633686.png",
        )
        .unwrap();
        let _result = segment::detect_objects_on_image(img_data);
    }
}

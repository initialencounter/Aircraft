use yolo;

// fn main() {
//     let image_dir = r"C:\Users\29115\yolov8\yolov11-seg\datasets_20k\package_image";
//     let not_package_image_dir =
//         r"C:\Users\29115\yolov8\yolov11-seg\datasets_20k\not_package_image";
//     let read_dir = match std::fs::read_dir(image_dir) {
//         Ok(dir) => dir,
//         Err(e) => {
//             println!("Failed to read directory: {}", e);
//             return;
//         }
//     };
//     for entry in read_dir {
//         let entry = match entry {
//             Ok(e) => e,
//             Err(e) => {
//                 println!("Failed to read entry: {}", e);
//                 continue;
//             }
//         };
//         let path = entry.path();
//         if path.is_dir() {
//             continue;
//         }
//         let file_name = match path.file_name().and_then(|n| n.to_str()) {
//             Some(name) => name.to_string(),
//             None => {
//                 println!("Failed to get file name for: {}", path.display());
//                 continue;
//             }
//         };

//         // 检查文件名是否符合要求
//         if !file_name.ends_with(".jpg") && !file_name.ends_with(".png") {
//             continue;
//         }
//         let image_buf = match std::fs::read(&path) {
//             Ok(buf) => buf,
//             Err(e) => {
//                 println!("Failed to read file {}: {}", path.display(), e);
//                 continue;
//             }
//         };
//         let result = yolo::segment::detect_objects_on_image(image_buf);
//         if result.is_empty() {
//             println!("[Not Package]: {}", path.display());
//             match std::fs::rename(&path, format!("{}\\{}", not_package_image_dir, file_name)) {
//                 Ok(_) => {}
//                 Err(e) => println!("Failed to move file: {}", e),
//             }
//             continue;
//         }
//         println!("{}", path.display());
//     }
// }



fn main() {
    // 读取图像文件
    let image_data = std::fs::read(r"C:\Users\29115\yolov8\yolov11-seg\datasets17k_yolo\images\train\img_000002.jpeg").unwrap();
    
    // 执行检测
    let results = yolo::segment::detect_objects_on_image(image_data);
    
    // 处理结果
    for result in results {
        println!("检测到 {}: 置信度 {:.2}", result.label, result.confidence);
        println!("边界框: ({:.0}, {:.0}) - ({:.0}, {:.0})", result.x1, result.y1, result.x2, result.y2);
        println!("掩码尺寸: {}x{}", result.mask.len(), result.mask[0].len());
        
        // mask 是一个二维数组，可以用来生成分割图像
        // mask[y][x] 的值为 255（前景）或 0（背景）
    }
}
// use yolo;

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

// fn main() {
//     // 读取图像文件
//     let image_data = std::fs::read(
//         r"C:\Users\29115\yolov8\yolov11-seg\datasets17k_yolo\images\train\img_000002.jpeg",
//     )
//     .unwrap();

//     // 执行检测
//     let results = yolo::segment::detect_objects_on_image(image_data);

//     // 处理结果
//     for result in results {
//         println!("检测到 {}: 置信度 {:.2}", result.label, result.confidence);
//         println!(
//             "边界框: ({:.0}, {:.0}) - ({:.0}, {:.0})",
//             result.x1, result.y1, result.x2, result.y2
//         );
//         println!("掩码尺寸: {}x{}", result.mask.len(), result.mask[0].len());

//         // mask 是一个二维数组，可以用来生成分割图像
//         // mask[y][x] 的值为 255（前景）或 0（背景）
//     }
// }

use pdf_parser;
mod remove_duplicate_project;
use serde_json::Value;
use std::error::Error;
use std::fs::File;
use std::io::BufReader;

#[tokio::main]
async fn main() {
    let _ = extract_images_from_json(r"D:\dev\Aircraft\image_classifier\search_deduped.json").await;
}

fn process_image(save_dir: &str, img_path: &str) -> Result<(), String> {
    let img = std::fs::read(img_path).map_err(|_| "Failed to read image from PDF.")?;

    let package_img = pdf_parser::read::read_pdf_img_bottom_right(&img)
        .map_err(|_| "Failed to read image from PDF.")?
        .ok_or("No package image found in PDF.")?;

    let img_name = std::path::Path::new(img_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap(); // 这个 unwrap 是安全的，因为路径必须有文件名

    let package_img_path = std::path::Path::new(save_dir).join(format!("{}.png", img_name));
    std::fs::create_dir_all(save_dir).map_err(|_| "Failed to create save directory.")?;
    println!("Saving image to: {}", package_img_path.display());

    std::fs::write(package_img_path, package_img).map_err(|_| "Failed to write image file.")?;

    Ok(())
}

fn get_project_nos(input_path: &str) -> Result<Vec<String>, Box<dyn Error>> {
    // 1. 读取输入的 JSON 文件
    let file = File::open(input_path)?;
    let reader = BufReader::new(file);
    let data: Value = serde_json::from_reader(reader)?;

    let mut project_nos = Vec::new();
    // 3. 检查数据中是否包含 rows 数组
    if let Some(array) = data.get("rows").and_then(|v| v.as_array()) {
        for item in array {
            // 尝试获取 project_no 字段的值
            if let Some(project_no) = item.get("projectNo").and_then(|v| v.as_str()) {
                // 如果 insert 返回 true，说明 HashSet 中之前没有这个名字
                project_nos.push(project_no.to_string());
            }
        }
    } else {
        return Err("JSON 结构中找不到 'rows' 数组".into());
    }
    Ok(project_nos)
}


async fn get_project_path(project_nos: Vec<String>) -> Vec<String> {
  let mut project_paths = Vec::new();
  for project_no in project_nos {
    let search_result = share::hotkey_handler::copy::search(project_no.clone()).await;
    if let Some(first_result) = search_result.first() {
      println!("Found project {}: {}", project_no.clone(), first_result.path.clone());
      project_paths.push(format!("{}/{}.pdf", first_result.path, project_no));
    }
  }
  return project_paths;
}

async fn extract_images_from_json(input_path: &str){
  // if let Ok(project_nos) = get_project_nos(input_path){
  //   let project_paths = get_project_path(project_nos).await;
  //   println!("{:?}", project_paths);
  //   std::fs::write("project_paths.txt", project_paths.join("\n")).expect("Unable to write file");
  //   // for project_path in project_paths {
  //   //   if let Err(e) = process_image("./background_images", &project_path) {
  //   //       println!("Error processing {}: {}", project_path, e);
  //   //   }
  //   // }
  // } else {
  //   println!("get_project_nos failed");
  // }
  //
  let _ = std::fs::read("D:\\dev\\Aircraft\\image_classifier\\project_paths.txt")
    .map_err(|e| println!("Failed to read project paths: {}", e))
    .and_then(|data| {
        let paths = String::from_utf8(data)
            .map_err(|e| println!("Failed to parse project paths: {}", e))?;
        Ok(paths.lines().map(|line| line.to_string()).collect::<Vec<String>>())
    })
    .map(|project_paths| {
        for project_path in project_paths {
            if let Err(e) = process_image("./background_images", &project_path) {
                println!("Error processing {}: {}", project_path, e);
            }
        }
    });
}

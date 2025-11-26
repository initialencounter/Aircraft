// Fork from https://github.com/pdf-rs/pdf/blob/master/pdf/examples/read.rs

use fax::tiff;
use pdf::content::Op;
use pdf::enc::StreamFilter;
use pdf::error::PdfError;
use pdf::object::Resolve;
use pdf::object::*;
use pdf::primitive::Name;
use pdf_extract::extract_text_from_mem;
use std::collections::HashMap;

use aircraft_types::pdf_parser::PdfReadResult;

pub fn replace_whitespace_with_space(text: &str) -> String {
    text.replace(char::is_whitespace, " ")
}

/// 使用 pdf_extract 读取 pdf 文件的文本内容
pub fn read_pdf_u8(data: &[u8]) -> Result<PdfReadResult, PdfError> {
    match extract_text_from_mem(data) {
        Ok(text) => {
            let image: Option<Vec<u8>> = read_pdf_img_bottom_right(data).unwrap_or_else(|_| None);
            Ok(PdfReadResult { text, image })
        }
        Err(_) => Ok(PdfReadResult {
            text: "".to_string(),
            image: None,
        }),
    }
}

#[derive(Debug, Clone)]
pub struct ImageWithPosition {
    pub data: Vec<u8>,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl ImageWithPosition {
    /// 计算图片右下角的坐标
    pub fn bottom_right_x(&self) -> f32 {
        self.x + self.width
    }

    pub fn bottom_right_y(&self) -> f32 {
        self.y + self.height
    }
}

/// 读取PDF图片并按真实位置排序
/// 通过解析PDF内容流获取图片的实际坐标
pub fn read_pdf_img_sorted(data: &[u8]) -> Result<Vec<ImageWithPosition>, PdfError> {
    let file = pdf::file::FileOptions::cached().load(data)?;
    let resolver = file.resolver();
    let mut images_with_pos: Vec<ImageWithPosition> = vec![];

    for page in file.pages() {
        let page = page?;
        let resources = page.resources()?;

        // 获取页面尺寸
        let media_box = page.media_box()?;
        let page_height = media_box.top - media_box.bottom;

        // 先收集所有图片对象,建立 name -> image 的映射
        let mut image_map: HashMap<Name, ImageXObject> = HashMap::new();
        for (name, &r) in resources.xobjects.iter() {
            if let Ok(obj) = resolver.get(r) {
                if let XObject::Image(ref img) = *obj {
                    image_map.insert(name.clone(), img.clone());
                }
            }
        }

        // 解析页面内容流,跟踪变换矩阵
        if let Some(contents_ref) = &page.contents {
            if let Ok(operations) = contents_ref.operations(&resolver) {
                // 图形状态栈 (变换矩阵)
                let mut transform_stack: Vec<[f32; 6]> = vec![[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]];

                for op in operations.iter() {
                    match op {
                        Op::Save => {
                            // q - 保存图形状态
                            if let Some(current) = transform_stack.last() {
                                transform_stack.push(*current);
                            }
                        }
                        Op::Restore => {
                            // Q - 恢复图形状态
                            if transform_stack.len() > 1 {
                                transform_stack.pop();
                            }
                        }
                        Op::Transform { matrix } => {
                            // cm - 变换矩阵
                            if let Some(current) = transform_stack.last_mut() {
                                // 矩阵乘法: new = matrix * current
                                let a = matrix.a;
                                let b = matrix.b;
                                let c = matrix.c;
                                let d = matrix.d;
                                let e = matrix.e;
                                let f = matrix.f;

                                let new_a = a * current[0] + b * current[2];
                                let new_b = a * current[1] + b * current[3];
                                let new_c = c * current[0] + d * current[2];
                                let new_d = c * current[1] + d * current[3];
                                let new_e = e * current[0] + f * current[2] + current[4];
                                let new_f = e * current[1] + f * current[3] + current[5];

                                *current = [new_a, new_b, new_c, new_d, new_e, new_f];
                            }
                        }
                        Op::XObject { name } => {
                            // Do - 绘制 XObject (可能是图片)
                            if let Some(img) = image_map.get(name.as_str()) {
                                // 获取当前变换矩阵
                                let matrix = transform_stack
                                    .last()
                                    .unwrap_or(&[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]);

                                // 在PDF中,图片被绘制在单位矩形 (0,0)-(1,1) 中
                                // 当前变换矩阵将这个单位矩形映射到页面坐标
                                // matrix = [a b c d e f] 表示仿射变换
                                // x' = a*x + c*y + e
                                // y' = b*x + d*y + f

                                let x = matrix[4]; // e - X 平移
                                let y = matrix[5]; // f - Y 平移
                                let width = matrix[0]; // a - X 缩放
                                let height = matrix[3]; // d - Y 缩放

                                // PDF 坐标系 Y 轴向上,转换为常规坐标系 (Y轴向下)
                                let y_top_down = page_height - y - height;

                                // 提取图片数据
                                if let Ok((mut data, filter)) = img.raw_image_data(&resolver) {
                                    match filter {
                                        Some(StreamFilter::DCTDecode(_)) => {}
                                        Some(StreamFilter::JBIG2Decode(_)) => {}
                                        Some(StreamFilter::JPXDecode) => {}
                                        Some(StreamFilter::FlateDecode(_)) => {}
                                        Some(StreamFilter::CCITTFaxDecode(_)) => {
                                            data = tiff::wrap(&data, img.width, img.height).into();
                                        }
                                        _ => continue,
                                    };

                                    images_with_pos.push(ImageWithPosition {
                                        data: data.to_vec(),
                                        x,
                                        y: y_top_down,
                                        width,
                                        height: height.abs(),
                                    });
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    // 排序: 从上到下(Y小到大),从左到右(X小到大)
    images_with_pos.sort_by(|a, b| {
        a.y.partial_cmp(&b.y)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal))
    });

    Ok(images_with_pos)
}

/// 只获取位于最右下角的图片
pub fn read_pdf_img_bottom_right(data: &[u8]) -> Result<Option<Vec<u8>>, PdfError> {
    let images = read_pdf_img_sorted(data)?;

    if images.is_empty() {
        return Ok(None);
    }

    // 找到最右下角的图片 (最大的 x + width 和 y + height)
    let bottom_right_image = images.iter().max_by(|a, b| {
        let a_score = a.bottom_right_x() + a.bottom_right_y();
        let b_score = b.bottom_right_x() + b.bottom_right_y();
        a_score
            .partial_cmp(&b_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(bottom_right_image.map(|img| img.data.clone()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_pdf_sorted() {
        let path = r"D:\dev\parse-rs\AEKGZ202511185140.pdf";
        let data = std::fs::read(path).unwrap();

        // 获取排序后的图片
        let images = read_pdf_img_sorted(&data).unwrap();
        println!("找到 {} 张图片", images.len());

        for (i, img) in images.iter().enumerate() {
            println!(
                "图片 {}: 位置({:.2}, {:.2}), 尺寸({:.2}, {:.2})",
                i, img.x, img.y, img.width, img.height
            );
            std::fs::write(format!("sorted_image_{}.png", i), &img.data).unwrap();
        }
    }

    #[test]
    fn test_read_pdf_bottom_right() {
        let path = r"D:\dev\parse-rs\AEKGZ202511185140.pdf";
        let data = std::fs::read(path).unwrap();

        // 只获取最右下角的图片
        if let Some(img_data) = read_pdf_img_bottom_right(&data).unwrap() {
            println!("找到最右下角的图片");
            std::fs::write("bottom_right_image.png", img_data).unwrap();
        } else {
            println!("未找到图片");
        }
    }
}

// Fork from https://github.com/pdf-rs/pdf/blob/master/pdf/examples/read.rs

use pdf::any::AnySync;
use pdf::enc::StreamFilter;
use pdf::error::PdfError;
use pdf::file::{File, NoLog, SyncCache};
use pdf::object::*;
use std::sync::Arc;

use fax::tiff;
use pdf::object::Resolve;
use pdf_extract::extract_text_from_mem;

pub fn replace_whitespace_with_space(text: &str) -> String {
    text.replace(char::is_whitespace, " ")
}

pub struct PdfReadResult {
    pub text: String,
    pub images: Option<Vec<Vec<u8>>>,
}

pub fn read_pdf_u8(data: Vec<u8>) -> Result<PdfReadResult, PdfError> {
    match extract_text_from_mem(&data) {
        Ok(text) => Ok(PdfReadResult { text, images: None }),
        Err(_) => Ok(PdfReadResult {
            text: "".to_string(),
            images: None,
        }),
    }
}

pub fn read_pdf(path: &str, required_image: bool) -> Result<PdfReadResult, PdfError> {
    let data = std::fs::read(path)?;
    let text = match extract_text_from_mem(&data) {
        Ok(text) => text,
        Err(_) => "".to_string(),
    };
    let file = pdf::file::FileOptions::cached().load(data)?;
    let mut images = None;
    if required_image {
        images = match read_pdf_img(file) {
            Ok(images) => Some(images),
            Err(_) => None,
        }
    }
    Ok(PdfReadResult { text, images })
}

pub fn read_pdf_img(
    file: File<
        Vec<u8>,
        Arc<SyncCache<PlainRef, Result<AnySync, Arc<PdfError>>>>,
        Arc<SyncCache<PlainRef, Result<Arc<[u8]>, Arc<PdfError>>>>,
        NoLog,
    >,
) -> Result<Vec<Vec<u8>>, PdfError> {
    let resolver = file.resolver();
    let mut images: Vec<_> = vec![];

    for page in file.pages() {
        let page = page?;
        let resources = page.resources()?;
        images.extend(
            resources
                .xobjects
                .iter()
                .map(|(_name, &r)| resolver.get(r).unwrap())
                .filter(|o| matches!(**o, XObject::Image(_))),
        );
    }

    let mut image_buffer_vec: Vec<Vec<u8>> = vec![];
    // 提取图片
    for (_i, o) in images.iter().enumerate() {
        let img = match **o {
            XObject::Image(ref im) => im,
            _ => continue,
        };
        let (mut data, filter) = img.raw_image_data(&resolver)?;
        match filter {
            Some(StreamFilter::DCTDecode(_)) => "jpeg",
            Some(StreamFilter::JBIG2Decode(_)) => "jbig2",
            Some(StreamFilter::JPXDecode) => "jp2k",
            Some(StreamFilter::FlateDecode(_)) => "png",
            Some(StreamFilter::CCITTFaxDecode(_)) => {
                data = tiff::wrap(&data, img.width, img.height).into();
                "tiff"
            }
            _ => continue,
        };
        image_buffer_vec.push(data.to_vec());
    }
    Ok(image_buffer_vec)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_pdf() {
        let path = r"C:\\Users\\29115\\RustroverProjects\\extractous\\test.pdf";
        let result = read_pdf(path, false).unwrap();
        println!("{:?}", result.text);
    }
}

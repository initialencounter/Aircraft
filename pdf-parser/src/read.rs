// Fork from https://github.com/pdf-rs/pdf/blob/master/pdf/examples/read.rs

use pdf::any::AnySync;
use pdf::enc::StreamFilter;
use pdf::error::PdfError;
use pdf::file::{File, FileOptions, NoLog, SyncCache};
use pdf::object::*;
use std::sync::Arc;

use fax::tiff;
use pdf::content::*;
use pdf::encoding::BaseEncoding;
use pdf::font::*;
use pdf::object::{MaybeRef, RcRef, Resolve};
use std::collections::HashMap;
use std::convert::TryInto;

struct FontInfo {
    font: RcRef<Font>,
    cmap: ToUnicodeMap,
}
struct Cache {
    fonts: HashMap<String, FontInfo>,
}
impl Cache {
    fn new() -> Self {
        Cache {
            fonts: HashMap::new(),
        }
    }
    fn add_font(&mut self, name: impl Into<String>, font: RcRef<Font>, resolver: &impl Resolve) {
        if let Some(to_unicode) = font.to_unicode(resolver) {
            self.fonts.insert(
                name.into(),
                FontInfo {
                    font,
                    cmap: to_unicode.unwrap(),
                },
            );
        }
    }
    fn get_font(&self, name: &str) -> Option<&FontInfo> {
        self.fonts.get(name)
    }
}
fn add_string(data: &[u8], out: &mut String, info: &FontInfo) {
    if let Some(encoding) = info.font.encoding() {
        match encoding.base {
            BaseEncoding::IdentityH => {
                for w in data.windows(2) {
                    let cp = u16::from_be_bytes(w.try_into().unwrap());
                    if let Some(s) = info.cmap.get(cp) {
                        out.push_str(s);
                    }
                }
            }
            _ => {
                for &b in data {
                    if let Some(s) = info.cmap.get(b as u16) {
                        out.push_str(s);
                    } else {
                        out.push(b as char);
                    }
                }
            }
        };
    }
}

pub fn replace_whitespace_with_space(text: &str) -> String {
    text.replace(char::is_whitespace, " ")
}

pub struct PdfReadResult {
    pub text: String,
    pub images: Option<Vec<Vec<u8>>>,
}

pub fn read_pdf_u8(data: Vec<u8>) -> Result<PdfReadResult, PdfError> {
    let file = pdf::file::FileOptions::cached().load(data)?;
    read_pdf_file(file, false)
}

pub fn read_pdf(path: &str, required_image: bool) -> Result<PdfReadResult, PdfError> {
    let file = FileOptions::cached().open(&path)?;
    read_pdf_file(file, required_image)
}

pub fn read_pdf_file(
    file: File<
        Vec<u8>,
        Arc<SyncCache<PlainRef, Result<AnySync, Arc<PdfError>>>>,
        Arc<SyncCache<PlainRef, Result<Arc<[u8]>, Arc<PdfError>>>>,
        NoLog,
    >,
    required_image: bool,
) -> Result<PdfReadResult, PdfError> {
    let resolver = file.resolver();

    let mut images: Vec<_> = vec![];
    let mut out = String::new();

    for page in file.pages() {
        let page = page?;
        let resources = page.resources()?;
        let mut cache = Cache::new();

        // make sure all fonts are in the cache, so we can reference them
        for (name, font) in resources.fonts.clone() {
            match font {
                MaybeRef::Indirect(font) => {
                    cache.add_font(name.as_str(), font.clone(), &resolver);
                }
                _ => {}
            }
        }
        for gs in resources.graphics_states.values() {
            if let Some((font, _)) = gs.font {
                let font = resolver.get(font)?;
                if let Some(font_name) = &font.name {
                    cache.add_font(font_name.as_str(), font.clone(), &resolver);
                }
            }
        }
        let mut current_font = None;
        let contents = match page.contents.as_ref() {
            Some(c) => c,
            None => continue,
        };
        for op in contents.operations(&resolver)?.iter() {
            match op {
                Op::GraphicsState { name } => {
                    let gs = match resources.graphics_states.get(name) {
                        Some(gs) => gs,
                        None => continue,
                    };
                    if let Some((font_ref, _)) = gs.font {
                        let font = resolver.get(font_ref)?;
                        if let Some(font_name) = &font.name {
                            current_font = cache.get_font(font_name.as_str());
                        }
                    }
                }
                // text font
                Op::TextFont { name, .. } => {
                    current_font = cache.get_font(name.as_str());
                }
                Op::TextDraw { text } => {
                    if let Some(font) = current_font {
                        add_string(&text.data, &mut out, font);
                    }
                }
                Op::TextDrawAdjusted { array } => {
                    if let Some(font) = current_font {
                        for data in array {
                            if let TextDrawAdjusted::Text(text) = data {
                                add_string(&text.data, &mut out, font);
                            }
                        }
                    }
                }
                Op::EndText => {
                    out.push(' ');
                }
                _ => {}
            }
        }
        if required_image {
            // 提取图片
            images.extend(
                resources
                    .xobjects
                    .iter()
                    .map(|(_name, &r)| resolver.get(r).unwrap())
                    .filter(|o| matches!(**o, XObject::Image(_))),
            );
        }
    }
    out = replace_whitespace_with_space(&out);

    if required_image {
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
        Ok(PdfReadResult {
            text: out,
            images: Some(image_buffer_vec),
        })
    } else {
        Ok(PdfReadResult {
            text: out,
            images: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_pdf() {
        let path = r"0.pdf";
        let _result = read_pdf(path, false).unwrap();
    }
}

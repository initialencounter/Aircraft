use pdf_inspector::vision::{OcrPdfOptions, process_pdf_with_ocr};
use pdf_inspector::{detect_pdf_mem, process_pdf_mem};

pub fn is_text_based_document_from_mem(bytes: &[u8]) -> bool {
    match detect_pdf_mem(bytes) {
        Ok(info) => matches!(info.pdf_type, pdf_inspector::PdfType::TextBased),
        Err(_) => false,
    }
}

pub fn extract_text_from_mem(bytes: &[u8]) -> String {
    if let Ok(result) = process_pdf_mem(&bytes) {
        if let Some(markdown) = result.markdown {
            return markdown;
        }
    }
    return "".to_string();
}

pub fn extract_text_from_mem_with_ocr(path: &str) -> String {
    if let Ok(result) = process_pdf_with_ocr(path, OcrPdfOptions::auto()) {
        return result.markdown;
    }
    return "".to_string();
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_extract_text_from_mem() {
        for i in 5..=5 {
            // V4/R4 但 CFM=/V2 实际用 RC4 加密 (AES 路径会报 "数据长度非法", 需按 RC4 解密)
            let path = format!(r"C:\Users\29115\Documents\lims-test-data\decrypt\{}.pdf", i);
            let data = std::fs::read(&path).unwrap();
            let markdown: String;
            if !is_text_based_document_from_mem(&data) {
                markdown = extract_text_from_mem_with_ocr(&path);
            } else {
                markdown = extract_text_from_mem(&data);
            }
            std::fs::write(
                format!(
                    r"C:\Users\29115\Documents\lims-test-data\decrypt\{}_extracted.md",
                    i
                ),
                markdown,
            )
            .unwrap();
        }
    }
}

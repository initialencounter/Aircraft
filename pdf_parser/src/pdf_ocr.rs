use std::path::{Path, PathBuf};
use std::process::Command;

use crate::read::{decrypt_pdf, extract_pdf_text};

/// 提取 PDF 文本的服务:
/// 1. 有文本层 → 直接提取
/// 2. 加密 → 先解密生成未加密副本再提取
/// 3. 无文本层 → 用 Ghostscript 渲染页面后 tesseract OCR
pub struct PdfOcrService {
    /// tesseract 可执行文件, 默认 "tesseract" (需在 PATH 中)
    tesseract_path: String,
    /// Ghostscript 可执行文件, 用于把 PDF 渲染成图片。
    /// Windows 上为 "gswin64c", Linux 上为 "gs", 默认 Windows 名称
    gs_path: String,
    /// OCR 语言 (对应 `-l` 参数), 默认 None 使用 tesseract 默认语言
    lang: Option<String>,
    /// 渲染分辨率 (DPI), 默认 300
    dpi: u32,
}

impl Default for PdfOcrService {
    fn default() -> Self {
        Self {
            tesseract_path: "tesseract".to_string(),
            gs_path: "gswin64c".to_string(),
            lang: None,
            dpi: 300,
        }
    }
}

impl PdfOcrService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_tesseract_path(mut self, path: impl Into<String>) -> Self {
        self.tesseract_path = path.into();
        self
    }

    pub fn with_gs_path(mut self, path: impl Into<String>) -> Self {
        self.gs_path = path.into();
        self
    }

    pub fn with_lang(mut self, lang: impl Into<String>) -> Self {
        self.lang = Some(lang.into());
        self
    }

    pub fn with_dpi(mut self, dpi: u32) -> Self {
        self.dpi = dpi;
        self
    }

    /// 提取 PDF 文本。文本层提取失败或为空时自动回退到 OCR。
    pub fn extract_text(&self, data: &[u8]) -> Result<String, PdfOcrError> {
        // 1+2: 文本层提取 / 解密后提取
        let text = extract_pdf_text(data);
        if !text.trim().is_empty() {
            return Ok(text);
        }
        // 3: 无文本层, 优先用解密+清理后的副本做 OCR (兼容加密/畸形 xref 的 PDF)
        let ocr_input = decrypt_pdf(data).unwrap_or_else(|_| data.to_vec());
        self.ocr(&ocr_input)
    }

    /// 用 Ghostscript 渲染 PDF 每页为图片, 再逐页用 tesseract OCR
    fn ocr(&self, pdf: &[u8]) -> Result<String, PdfOcrError> {
        let dir = temp_dir();
        std::fs::create_dir_all(&dir)?;
        let input = dir.join("input.pdf");
        std::fs::write(&input, pdf)?;

        let result = self.render_and_ocr(&dir, &input);
        let _ = std::fs::remove_dir_all(&dir);
        result
    }

    fn render_and_ocr(&self, dir: &Path, input: &Path) -> Result<String, PdfOcrError> {
        // 1. Ghostscript 渲染 PDF 每页为灰度 PNG (page_1.png, page_2.png, ...)
        let output_pattern = dir.join("page_%d.png");
        let gs = Command::new(&self.gs_path)
            .args(["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pnggray"])
            .arg(format!("-r{}", self.dpi))
            .arg(format!("-sOutputFile={}", output_pattern.display()))
            .arg(input)
            .output()
            .map_err(|e| PdfOcrError::RenderSpawn {
                path: self.gs_path.clone(),
                source: e,
            })?;
        if !gs.status.success() {
            return Err(PdfOcrError::RenderFailed {
                status: gs.status,
                stderr: String::from_utf8_lossy(&gs.stderr).trim().to_string(),
            });
        }

        // 2. 收集渲染出的 PNG 并按页码排序
        let mut pages: Vec<PathBuf> = std::fs::read_dir(dir)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension().map(|x| x == "png").unwrap_or(false)
                    && p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with("page_"))
                        .unwrap_or(false)
            })
            .collect();
        pages.sort_by_key(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .and_then(|n| n.strip_prefix("page_"))
                .and_then(|n| n.strip_suffix(".png"))
                .and_then(|n| n.parse::<u32>().ok())
                .unwrap_or(0)
        });
        if pages.is_empty() {
            return Err(PdfOcrError::NoPagesRendered);
        }

        // 3. 逐页 tesseract OCR, 结果按页码拼接
        let mut parts = Vec::new();
        for png in pages {
            let mut cmd = Command::new(&self.tesseract_path);
            cmd.arg(&png).arg("stdout");
            if let Some(lang) = &self.lang {
                cmd.arg("-l").arg(lang);
            }
            let out = cmd.output().map_err(|e| PdfOcrError::TesseractSpawn {
                path: self.tesseract_path.clone(),
                source: e,
            })?;
            if !out.status.success() {
                return Err(PdfOcrError::TesseractFailed {
                    status: out.status,
                    stderr: String::from_utf8_lossy(&out.stderr).trim().to_string(),
                });
            }
            let text = String::from_utf8_lossy(&out.stdout);
            if !text.trim().is_empty() {
                parts.push(text.trim().to_string());
            }
        }
        Ok(parts.join("\n"))
    }
}

/// 生成唯一的临时目录
fn temp_dir() -> PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("pdf_ocr_{}_{}", std::process::id(), nanos))
}

#[derive(Debug)]
pub enum PdfOcrError {
    /// 临时文件读写失败
    Io(std::io::Error),
    /// 无法启动 Ghostscript 进程
    RenderSpawn { path: String, source: std::io::Error },
    /// Ghostscript 渲染失败
    RenderFailed { status: std::process::ExitStatus, stderr: String },
    /// Ghostscript 未渲染出任何页面
    NoPagesRendered,
    /// 无法启动 tesseract 进程
    TesseractSpawn { path: String, source: std::io::Error },
    /// tesseract 执行失败
    TesseractFailed { status: std::process::ExitStatus, stderr: String },
}

impl std::fmt::Display for PdfOcrError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PdfOcrError::Io(e) => write!(f, "临时文件 IO 错误: {e}"),
            PdfOcrError::RenderSpawn { path, source } => {
                write!(f, "无法启动 Ghostscript ({path}): {source}")
            }
            PdfOcrError::RenderFailed { status, stderr } => {
                write!(f, "Ghostscript 渲染失败 ({}): {}", status, stderr)
            }
            PdfOcrError::NoPagesRendered => write!(f, "Ghostscript 未渲染出任何页面"),
            PdfOcrError::TesseractSpawn { path, source } => {
                write!(f, "无法启动 tesseract ({path}): {source}")
            }
            PdfOcrError::TesseractFailed { status, stderr } => {
                write!(f, "tesseract 执行失败 ({}): {}", status, stderr)
            }
        }
    }
}

impl std::error::Error for PdfOcrError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            PdfOcrError::Io(e) => Some(e),
            PdfOcrError::RenderSpawn { source, .. } => Some(source),
            PdfOcrError::TesseractSpawn { source, .. } => Some(source),
            _ => None,
        }
    }
}

impl From<std::io::Error> for PdfOcrError {
    fn from(e: std::io::Error) -> Self {
        PdfOcrError::Io(e)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_text_ocr_fallback() {
        // 加密且无文本层的扫描运单 PDF: 应走解密 -> gs 渲染 -> tesseract OCR
        let path = r"C:\Users\29115\RustroverProjects\validators\ts\encrypted.pdf";
        let data = std::fs::read(path).expect("读取测试 PDF 失败");

        let service = PdfOcrService::new().with_lang("chi_sim+eng");
        let text = service.extract_text(&data).expect("提取文本失败");
        println!("--- OCR 结果 (len {}) ---", text.len());
        println!("{}", &text[..text.len().min(300)]);

        assert!(!text.trim().is_empty());
        // OCR 应识别出报告标题或报告编号
        assert!(
            text.contains("锂电池") || text.contains("UN38") || text.contains("报告"),
            "OCR 结果未包含预期内容"
        );
    }
}

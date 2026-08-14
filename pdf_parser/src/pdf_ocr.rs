use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc::Sender;

use std::os::windows::process::CommandExt;

use aircraft_types::logger::LogMessage;
use pdf_extract::extract_text_from_mem;

use crate::read::{decrypt_pdf, is_encrypted, sanitize_pdf};

/// 提取 PDF 文本的服务:
/// 1. 有文本层 → 直接提取
/// 2. 加密 → 先解密生成未加密副本再提取
/// 3. 无文本层 → 用 Ghostscript 渲染页面后 tesseract OCR
#[derive(Debug, Clone)]
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
    pub log_tx: Option<Sender<LogMessage>>,
}

impl Default for PdfOcrService {
    fn default() -> Self {
        Self {
            tesseract_path: "tesseract".to_string(),
            gs_path: "gswin64c".to_string(),
            lang: None,
            dpi: 300,
            log_tx: None,
        }
    }
}

impl PdfOcrService {
    pub fn new(log_tx: Option<Sender<LogMessage>>) -> Self {
        match log_tx {
            Some(tx) => Self {
                log_tx: Some(tx),
                ..Self::default()
            },
            None => Self::default(),
        }
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

    pub fn with_log_tx(mut self, log_tx: Sender<LogMessage>) -> Self {
        self.log_tx = Some(log_tx);
        self
    }

    pub fn log(&self, level: &str, message: &str) {
        if let Some(tx) = &self.log_tx {
            let log_message = LogMessage {
                time_stamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                level: level.to_string(),
                message: message.to_string(),
            };
            let _ = tx.send(log_message);
        }
    }

    /// 提取 PDF 文本。文本层提取失败或为空时自动回退到 OCR。
    pub fn extract_text(&self, data: &[u8]) -> Result<String, PdfOcrError> {
        // 1+2: 文本层提取 / 解密后提取
        let text = self.extract_pdf_text(data);
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
        self.log(
            "INFO",
            &format!("开始 OCR: 渲染 PDF -> 图片, 输入文件: {}", input.display()),
        );
        // 1. Ghostscript 渲染 PDF 每页为灰度 PNG (page_1.png, page_2.png, ...)
        let output_pattern = dir.join("page_%d.png");
        let gs = Command::new(&self.gs_path)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW: 不弹出终端窗口
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
                    && p.file_name()
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
        let total_pages = pages.len();
        for png in pages {
            self.log(
                "INFO",
                &format!("OCR 提取中 {}/{}", parts.len() + 1, total_pages),
            );
            let mut cmd = Command::new(&self.tesseract_path);
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: 不弹出终端窗口
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

    /// 提取 PDF 文本层:
    /// 1. 若加密, 先解密生成未加密副本再提取
    /// 2. 否则直接提取 (pdf-extract 无法处理加密 PDF)
    /// 无文本层时返回空字符串
    pub fn extract_pdf_text(&self, data: &[u8]) -> String {
        let clean = sanitize_pdf(data);
        if is_encrypted(clean) {
            self.log("INFO", "PDF 加密, 尝试解密后提取文本层");
            let decrypted = match decrypt_pdf(clean) {
                Ok(d) => d,
                Err(e) => {
                    self.log("WARN", &format!("PDF 解密失败: {}", e));
                    return String::new();
                }
            };
            match extract_text_from_mem(&decrypted) {
                Ok(text) if !text.trim().is_empty() && text.trim().len() > 1000 => {
                    self.log("INFO", "PDF 解密后文本层提取成功");
                    text
                }
                Ok(_) => {
                    self.log("INFO", "PDF 解密后无文本层, 尝试 OCR 提取");
                    String::new()
                }
                Err(e) => {
                    self.log("WARN", &format!("PDF 解密后文本层提取失败: {}", e));
                    String::new()
                }
            }
        } else {
            match extract_text_from_mem(clean) {
                Ok(text) if !text.trim().is_empty() && text.trim().len() > 1000 => {
                    self.log("INFO", "PDF 文本层提取成功");
                    text
                }
                Ok(_) => {
                    self.log("INFO", "PDF 无文本层, 尝试 OCR 提取");
                    String::new()
                }
                Err(e) => {
                    self.log("WARN", &format!("PDF 文本层提取失败: {}", e));
                    String::new()
                }
            }
        }
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
    RenderSpawn {
        path: String,
        source: std::io::Error,
    },
    /// Ghostscript 渲染失败
    RenderFailed {
        status: std::process::ExitStatus,
        stderr: String,
    },
    /// Ghostscript 未渲染出任何页面
    NoPagesRendered,
    /// 无法启动 tesseract 进程
    TesseractSpawn {
        path: String,
        source: std::io::Error,
    },
    /// tesseract 执行失败
    TesseractFailed {
        status: std::process::ExitStatus,
        stderr: String,
    },
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
        let (sender, receiver) = std::sync::mpsc::channel::<LogMessage>();
        std::thread::spawn(move || {
            while let Ok(log) = receiver.recv() {
                let log_entry: String =
                    format!("[{}] {} - {}\n", log.time_stamp, log.level, log.message);
                print!("{}", log_entry);
            }
        });
        let service = PdfOcrService::new(Some(sender)).with_lang("chi_sim+eng");
        // 加密且无文本层的扫描运单 PDF: 应走解密 -> gs 渲染 -> tesseract OCR
        let path = r"C:\Users\29115\RustroverProjects\validators\ts\test.pdf";
        let data = std::fs::read(path).expect("读取测试 PDF 失败");

        let text = service.extract_text(&data).expect("提取文本失败");
        println!("--- OCR 结果 (len {}) ---", text.len());
        let preview: String = text.chars().take(300).collect();
        println!("{}", preview);
    }
}

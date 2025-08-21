use anyhow::Result;
use clipboard_rs::{common::RustImage, Clipboard, ClipboardContext, RustImageData};
use lazy_static::lazy_static;
use std::env;

lazy_static! {
    static ref IMAGE_BYTES: Vec<u8> = {
        let signature_path = get_signature_path().unwrap();
        let bytes = std::fs::read(signature_path).unwrap_or_else(|_| vec![]);
        bytes
    };
}
pub fn set_image_to_clipboard() -> Result<()> {
    let image_data = RustImageData::from_bytes(&IMAGE_BYTES).unwrap();
    // 将图片数据转换为 Base64 编码

    // 创建剪切板上下文
    let ctx: ClipboardContext = ClipboardContext::new().unwrap();

    // 将 Base64 字符串设置到剪切板
    ctx.set_image(image_data)
        .map_err(|e| anyhow::anyhow!(e.to_string()))
}

pub fn get_signature_path() -> Result<String> {
    let exe_path = env::current_exe()?;
    let parent_path = exe_path
        .parent()
        .ok_or_else(|| anyhow::anyhow!("无法获取父目录"))?;
    let signature_path_buf = parent_path.join("signature.png");
    let signature_path = signature_path_buf
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("路径转换失败"))?;
    Ok(signature_path.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_get_signature_path() {
        let path = get_signature_path().unwrap();
        println!("{}", path);
    }
    #[test]
    fn test_set_image_to_clipboard() {
        set_image_to_clipboard().unwrap();
    }
}

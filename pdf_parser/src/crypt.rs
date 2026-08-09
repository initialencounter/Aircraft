//! PDF 加密破解:
//! - RC4 (V=1/2, R=2/3) 由 lopdf 的 Document::decrypt 处理
//! - AESV2 (V=4, R=4, AES-128-CBC) 在此手动实现 (lopdf 0.34 不支持 AES)

use aes::Aes128;
use cbc::Decryptor;
use cbc::cipher::{BlockDecryptMut, KeyIvInit};
use lopdf::{Document, Object, ObjectId};

use std::error::Error;

/// PDF 32 字节密码填充块 (PDF 32000-1 7.6.3.3)
const PAD: [u8; 32] = [
    0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
    0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
];

type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

/// 破解加密的 PDF, 返回未加密的 Document
pub fn decrypt_document(doc: Document, password: &[u8]) -> Result<Document> {
    let mut doc = doc;
    let encrypt_ref = match doc.trailer.get(b"Encrypt").and_then(|o| o.as_reference()) {
        Ok(r) => r,
        Err(_) => return Ok(doc), // 未加密
    };

    let encrypt = doc.get_object(encrypt_ref)?.as_dict()?.clone();
    let v = encrypt.get(b"V").and_then(Object::as_i64).unwrap_or(0);
    let r = encrypt.get(b"R").and_then(Object::as_i64).unwrap_or(0);

    // lopdf 支持 RC4: V=1/2, R=2/3
    if (1..=2).contains(&v) && (2..=3).contains(&r) {
        doc.decrypt(password)?;
        doc.trailer.remove(b"Encrypt");
        return Ok(doc);
    }

    // AESV2: V=4, R=4, AES-128-CBC
    if v == 4 && r == 4 {
        return decrypt_aesv2(doc, &encrypt, encrypt_ref, password);
    }

    Err(format!("不支持的加密方案 V={v} R={r}").into())
}

/// AESV2 (Algorithm 2 密钥推导 + Algorithm 1 逐对象解密)
fn decrypt_aesv2(
    mut doc: Document,
    encrypt: &lopdf::Dictionary,
    encrypt_ref: ObjectId,
    password: &[u8],
) -> Result<Document> {
    const KEY_LEN: usize = 16;

    let o = encrypt.get(b"O").and_then(Object::as_str)?; // 32 字节
    let p = encrypt.get(b"P").and_then(Object::as_i64)? as u32;
    let u = encrypt.get(b"U").and_then(Object::as_str)?; // 32 字节

    let file_id = doc
        .trailer
        .get(b"ID")?
        .as_array()?
        .first()
        .ok_or("加密 PDF 缺少 /ID 文件标识")?
        .as_str()?;

    // Algorithm 2: 推导文件级加密密钥。
    // 0xFF 后缀是否追加存在实现差异, 用 /U (Algorithm 5) 校验两种候选来确定。
    let derive = |append_ff: bool| {
        let mut data = Vec::with_capacity(72);
        // a) 密码填充到 32 字节
        let n = password.len().min(32);
        data.extend_from_slice(&password[..n]);
        data.extend_from_slice(&PAD[n..32]);
        // c) O 条目
        data.extend_from_slice(o);
        // d) P 权限位 (小端 32 位)
        data.extend_from_slice(&p.to_le_bytes());
        // f) 文件标识
        data.extend_from_slice(file_id);
        // g/h) 是否追加 0xFF
        if append_ff {
            data.extend_from_slice(&[0xFFu8; 4]);
        }
        // i) MD5, j) 50 轮迭代
        let mut digest = md5::compute(&data).0;
        for _ in 0..50 {
            digest = md5::compute(&digest[..KEY_LEN]).0;
        }
        digest
    };

    let key = {
        let k_no_ff = derive(false);
        if check_user_password(file_id, &k_no_ff, u) {
            k_no_ff
        } else {
            let k_ff = derive(true);
            if check_user_password(file_id, &k_ff, u) {
                k_ff
            } else {
                return Err("用户密码不正确".into());
            }
        }
    };

    // Algorithm 1: 逐对象解密 (跳过加密字典, EncryptMetadata=false 时跳过 Metadata)
    let encrypt_metadata = encrypt
        .get(b"EncryptMetadata")
        .and_then(Object::as_bool)
        .unwrap_or(true);

    for (&id, obj) in doc.objects.iter_mut() {
        if id == encrypt_ref {
            continue;
        }
        if obj.type_name().unwrap_or("") == "Metadata" && !encrypt_metadata {
            continue;
        }
        // b) 对象密钥 = MD5(file_key + 对象号(3 LE) + 代次号(2 LE) + "sAlT")
        //    字典/数组内的内联字符串用所属对象的密钥, 一并递归解密
        let obj_key = object_key(&key, id);
        decrypt_object(obj, &obj_key)?;
    }

    // 移除加密字典, 输出未加密文档
    doc.trailer.remove(b"Encrypt");
    Ok(doc)
}

/// 对象密钥 = MD5(file_key + 对象号(3 LE) + 代次号(2 LE) + "sAlT")
fn object_key(file_key: &[u8], id: ObjectId) -> [u8; 16] {
    let mut key_data = Vec::with_capacity(16 + 9);
    key_data.extend_from_slice(file_key);
    key_data.extend_from_slice(&id.0.to_le_bytes()[..3]);
    key_data.extend_from_slice(&id.1.to_le_bytes()[..2]);
    key_data.extend_from_slice(b"sAlT");
    md5::compute(&key_data).0
}

/// 递归解密对象内的字符串与流内容 (Algorithm 1)
fn decrypt_object(obj: &mut Object, obj_key: &[u8; 16]) -> Result<()> {
    match obj {
        Object::String(content, _) => {
            *content = aes128_decrypt(obj_key, content)?;
        }
        Object::Stream(stream) => {
            stream.content = aes128_decrypt(obj_key, &stream.content)?;
            decrypt_dict(&mut stream.dict, obj_key)?;
        }
        Object::Dictionary(dict) => decrypt_dict(dict, obj_key)?,
        Object::Array(arr) => {
            for v in arr.iter_mut() {
                decrypt_object(v, obj_key)?;
            }
        }
        _ => {}
    }
    Ok(())
}

/// 解密字典中的内联字符串
fn decrypt_dict(dict: &mut lopdf::Dictionary, obj_key: &[u8; 16]) -> Result<()> {
    for (_, v) in dict.iter_mut() {
        decrypt_object(v, obj_key)?;
    }
    Ok(())
}

/// Algorithm 5: 校验用户口令 (R3/R4)
/// U[0..16] = 链式 RC4 加密 MD5(PADDING + 文件标识)
fn check_user_password(file_id: &[u8], key: &[u8; 16], u: &[u8]) -> bool {
    let mut data = Vec::with_capacity(48);
    data.extend_from_slice(&PAD);
    data.extend_from_slice(file_id);
    let mut d = md5::compute(&data).0;
    // d) 用文件密钥 RC4 加密
    rc4(key, &mut d);
    // e) 用 key XOR i 逐轮 RC4 (i = 1..=19)
    for i in 1u8..20 {
        let mut rk = [0u8; 16];
        for (j, b) in rk.iter_mut().enumerate() {
            *b = key[j] ^ i;
        }
        rc4(&rk, &mut d);
    }
    u.starts_with(&d)
}

/// AES-128-CBC 解密 (PKCS7 去填充), 数据前 16 字节为 IV
fn aes128_decrypt(key: &[u8; 16], data: &[u8]) -> Result<Vec<u8>> {
    if data.len() < 32 || (data.len() - 16) % 16 != 0 {
        return Err("AESV2 数据长度非法".into());
    }
    let (iv, ct) = data.split_at(16);
    let mut buf = ct.to_vec();
    let dec = Decryptor::<Aes128>::new_from_slices(key, iv).map_err(|_| "AESV2 密钥长度非法")?;
    let out = dec
        .decrypt_padded_mut::<cbc::cipher::block_padding::Pkcs7>(&mut buf)
        .map_err(|_| "AESV2 解密失败 (数据填充非法, 可能密码不正确)")?;
    Ok(out.to_vec())
}

/// RC4 加解密 (就地)
fn rc4(key: &[u8], data: &mut [u8]) {
    let mut s: [u8; 256] = core::array::from_fn(|i| i as u8);
    let mut j = 0usize;
    for i in 0..256 {
        j = (j + s[i] as usize + key[i % key.len()] as usize) & 0xFF;
        s.swap(i, j);
    }
    let (mut i, mut j) = (0usize, 0usize);
    for byte in data.iter_mut() {
        i = (i + 1) & 0xFF;
        j = (j + s[i] as usize) & 0xFF;
        s.swap(i, j);
        let k = (s[i] as usize + s[j] as usize) & 0xFF;
        *byte ^= s[k];
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rc4_known_vector() {
        // "Wiki" -> 用密钥 "Wiki" 加密 "pedia"
        let mut data = b"pedia".to_vec();
        rc4(b"Wiki", &mut data);
        assert_eq!(data, [0x10, 0x21, 0xBF, 0x04, 0x20]);
        rc4(b"Wiki", &mut data); // 再解一次还原
        assert_eq!(data, b"pedia");
    }
}

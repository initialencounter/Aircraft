//! PDF 加密破解:
//! - RC4 (V=1/2, R=2/3) 由 lopdf 的 Document::decrypt 处理
//! - V4/R4 (AES-128-CBC 或 RC4, 由 /CF 的 CFM 决定) 在此手动实现 (lopdf 0.34 不支持 AES)

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

/// 移除加密标记: 常规在 trailer, 少数工具还会把 /Encrypt 写进 Catalog。
/// 加密字典对象本身也一并从对象表移除, 避免重新序列化时残留。
fn remove_encrypt(doc: &mut Document, encrypt_ref: ObjectId) {
    doc.trailer.remove(b"Encrypt");
    if let Ok(root_ref) = doc.trailer.get(b"Root").and_then(Object::as_reference) {
        if let Ok(root) = doc.get_object_mut(root_ref) {
            if let Ok(dict) = root.as_dict_mut() {
                dict.remove(b"Encrypt");
            }
        }
    }
    doc.objects.remove(&encrypt_ref);
}

/// 破解加密的 PDF, 返回未加密的 Document
/// `file_data` 为加载前的原始字节 (lopdf 加载加密 ObjStm 时可能已破坏其内容,
/// 需回读原始字节恢复, 见 [`recover_objstm`])
pub fn decrypt_document(doc: Document, password: &[u8], file_data: &[u8]) -> Result<Document> {
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
        remove_encrypt(&mut doc, encrypt_ref);
        return Ok(doc);
    }

    // V4/R4: AES-128-CBC 或 RC4 (由 /CF 的 CFM 决定)
    if v == 4 && r == 4 {
        return decrypt_v4(doc, &encrypt, encrypt_ref, password, file_data);
    }

    Err(format!("不支持的加密方案 V={v} R={r}").into())
}

/// V4/R4 加密 (Algorithm 2 密钥推导 + Algorithm 1 逐对象解密)
/// 实际算法由 /CF 字典里的 CFM 决定: AESV2 → AES-128-CBC, V2 → RC4 (与 qpdf 一致)
fn decrypt_v4(
    mut doc: Document,
    encrypt: &lopdf::Dictionary,
    encrypt_ref: ObjectId,
    password: &[u8],
    file_data: &[u8],
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

    // 解析 StrF / StmF 实际使用的加密方法 (CFM: V2=RC4, AESV2=AES)
    let str_filter = encrypt.get(b"StrF").ok().and_then(|o| o.as_name().ok());
    let stm_filter = encrypt.get(b"StmF").ok().and_then(|o| o.as_name().ok());
    let str_method = crypt_method(encrypt, str_filter);
    let stm_method = crypt_method(encrypt, stm_filter);

    // Algorithm 1: 逐对象解密 (跳过加密字典, EncryptMetadata=false 时跳过 Metadata)
    let encrypt_metadata = encrypt
        .get(b"EncryptMetadata")
        .and_then(Object::as_bool)
        .unwrap_or(true);

    // 加密的 ObjStm 流在 lopdf 加载时已被解压失败并清空内容, 内部的压缩对象
    // 随之丢失 (如本文件的 /Pages)。解密时从原始字节回读密文, 解密后解包注入。
    // 先克隆 xref 表, 避免与对象的可变借用冲突。
    let reference_table = doc.reference_table.clone();
    let mut recovered: Vec<(ObjectId, Object)> = Vec::new();

    for (&id, obj) in doc.objects.iter_mut() {
        if id == encrypt_ref {
            continue;
        }
        if obj.type_name().unwrap_or("") == "Metadata" && !encrypt_metadata {
            continue;
        }
        if obj.type_name().unwrap_or("") == "ObjStm" {
            // 加密 ObjStm 流在 lopdf 加载时被清空内容, 才需要回读恢复;
            // 明文/已解包的 ObjStm (内容完好) 保持原样即可。流本身不参与常规解密。
            if let Object::Stream(s) = obj {
                if s.content.is_empty() {
                    if let Some(objs) =
                        recover_objstm(file_data, &reference_table, id, &key, stm_method)?
                    {
                        recovered.extend(objs);
                    }
                }
            }
            continue;
        }
        // b) 对象密钥 = MD5(file_key + 对象号(3 LE) + 代次号(2 LE) [+ "sAlT" 仅 AES])
        //    AES 与 RC4 推导不同, 一并预计算。
        //    字典/数组内的内联字符串用所属对象的密钥, 一并递归解密
        let aes_key = object_key(&key, id);
        let rc4_key = object_key_rc4(&key, id);
        decrypt_object(obj, &aes_key, &rc4_key, str_method, stm_method)?;
    }

    // 解包出的对象同样按各自的对象密钥加密, 解密后再写入对象表
    for (oid, mut obj) in recovered {
        let aes_key = object_key(&key, oid);
        let rc4_key = object_key_rc4(&key, oid);
        decrypt_object(&mut obj, &aes_key, &rc4_key, str_method, stm_method)?;
        doc.objects.entry(oid).or_insert(obj);
    }

    // 移除加密字典, 输出未加密文档
    remove_encrypt(&mut doc, encrypt_ref);
    Ok(doc)
}

/// 回读被 lopdf 破坏的加密 ObjStm 流并解包出内部对象。
/// lopdf 加载时对加密的 ObjStm 流解压 (FlateDecode) 失败且吞掉错误, 内容被清空,
/// 内部压缩对象 (如 /Pages) 随之丢失。这里用原始字节 + 已加载的 xref 表重新读取
/// 密文, 按 StmF 解密后由 [`lopdf::ObjectStream`] 解包。
fn recover_objstm(
    file_data: &[u8],
    xref: &lopdf::xref::Xref,
    obj_id: ObjectId,
    key: &[u8; 16],
    stm_method: Method,
) -> Result<Option<Vec<(ObjectId, Object)>>> {
    let mut rd_doc = Document::new();
    rd_doc.reference_table = xref.clone();
    let reader = lopdf::Reader {
        buffer: file_data,
        document: rd_doc,
    };
    let raw = reader
        .get_object(obj_id, &mut std::collections::HashSet::new())
        .map_err(|e| format!("读取 ObjStm {}.{} 失败: {e}", obj_id.0, obj_id.1))?;
    let lopdf::Object::Stream(raw_stream) = raw else {
        return Ok(None);
    };
    let plain = match stm_method {
        Method::Aes128 => aes128_decrypt(&object_key(key, obj_id), &raw_stream.content)?,
        Method::Rc4 => {
            let mut c = raw_stream.content.clone();
            rc4(&object_key_rc4(key, obj_id), &mut c);
            c
        }
    };
    // ObjectStream::new 内部对解密后的明文 Flate 数据解压并解析 index 块
    let obj_stream = lopdf::ObjectStream::new(&mut lopdf::Stream::new(raw_stream.dict, plain))
        .map_err(|e| format!("解包 ObjStm {}.{} 失败: {e}", obj_id.0, obj_id.1))?;
    Ok(Some(obj_stream.objects.into_iter().collect()))
}

/// V4/R4 下各对象的加密算法
#[derive(Clone, Copy)]
enum Method {
    /// AES-128-CBC (对象密钥带 "sAlT" 盐)
    Aes128,
    /// RC4 (对象密钥无盐, 长度保持)
    Rc4,
}

/// 解析加密字典中 StrF/StmF 指向的 crypt filter 的加密方法。
/// CFM: V2 → RC4, AESV2/AESV3 → AES-128。未知或缺省按 AES (与 qpdf 的回退一致)。
fn crypt_method(encrypt: &lopdf::Dictionary, filter: Option<&[u8]>) -> Method {
    let cfm = encrypt
        .get(b"CF")
        .ok()
        .and_then(|cf| cf.as_dict().ok())
        .and_then(|cf| filter.and_then(|name| cf.get(name).ok()))
        .and_then(|f| f.as_dict().ok())
        .and_then(|f| f.get(b"CFM").ok())
        .and_then(|m| m.as_name().ok());
    match cfm {
        Some(b"V2") => Method::Rc4,
        Some(b"AESV2") | Some(b"AESV3") => Method::Aes128,
        _ => Method::Aes128,
    }
}

/// 对象密钥 (AES) = MD5(file_key + 对象号(3 LE) + 代次号(2 LE) + "sAlT")
fn object_key(file_key: &[u8], id: ObjectId) -> [u8; 16] {
    let mut key_data = Vec::with_capacity(16 + 9);
    key_data.extend_from_slice(file_key);
    key_data.extend_from_slice(&id.0.to_le_bytes()[..3]);
    key_data.extend_from_slice(&id.1.to_le_bytes()[..2]);
    key_data.extend_from_slice(b"sAlT");
    md5::compute(&key_data).0
}

/// 对象密钥 (RC4) = MD5(file_key + 对象号(3 LE) + 代次号(2 LE)), 无 sAlT
fn object_key_rc4(file_key: &[u8], id: ObjectId) -> [u8; 16] {
    let mut key_data = Vec::with_capacity(16 + 5);
    key_data.extend_from_slice(file_key);
    key_data.extend_from_slice(&id.0.to_le_bytes()[..3]);
    key_data.extend_from_slice(&id.1.to_le_bytes()[..2]);
    md5::compute(&key_data).0
}

/// 递归解密对象内的字符串与流内容 (Algorithm 1)
/// 字符串按 StrF、流按 StmF 的加密方法分别处理 (AES 或 RC4)
fn decrypt_object(
    obj: &mut Object,
    aes_key: &[u8; 16],
    rc4_key: &[u8; 16],
    str_method: Method,
    stm_method: Method,
) -> Result<()> {
    match obj {
        Object::String(content, _) => match str_method {
            Method::Aes128 => match aes128_decrypt(aes_key, content) {
                Ok(d) => *content = d,
                // 部分生产者写入未加密或非块对齐的字符串 (如签名 /Reference 的
                // /DigestValue), 与 qpdf 的容错行为一致: 保留原值, 不中止
                Err(e) => eprintln!("警告: 字符串 AES 解密失败, 保留原值 ({e})"),
            },
            Method::Rc4 => rc4(rc4_key, content),
        },
        Object::Stream(stream) => {
            // 结构对象不参与加密 (PDF 32000-1 §7.5.8 / §7.6.1), 整体跳过:
            // - /Type /XRef 交叉引用流
            // - 流字典显式引用加密字典 (/Encrypt) 的未加密流
            // 空流 (如 lopdf 对加密 ObjStm 解压失败后 content 置空) 无内容可解
            if stream.dict.type_is(b"XRef")
                || stream.dict.has(b"Encrypt")
                || stream.content.is_empty()
            {
                return Ok(());
            }
            match stm_method {
                // set_content 同步更新 /Length: AES 解密会去掉 IV 和填充, 长度变短
                Method::Aes128 => {
                    let plain = aes128_decrypt(aes_key, &stream.content)?;
                    stream.set_content(plain);
                }
                Method::Rc4 => rc4(rc4_key, &mut stream.content),
            }
            decrypt_dict(&mut stream.dict, aes_key, rc4_key, str_method, stm_method)?;
        }
        Object::Dictionary(dict) => decrypt_dict(dict, aes_key, rc4_key, str_method, stm_method)?,
        Object::Array(arr) => {
            for v in arr.iter_mut() {
                decrypt_object(v, aes_key, rc4_key, str_method, stm_method)?;
            }
        }
        _ => {}
    }
    Ok(())
}

/// 解密字典中的内联字符串
fn decrypt_dict(
    dict: &mut lopdf::Dictionary,
    aes_key: &[u8; 16],
    rc4_key: &[u8; 16],
    str_method: Method,
    stm_method: Method,
) -> Result<()> {
    // 签名字典 (含 /ByteRange) 的 /Contents 是 CMS 签名值, 签署时以明文写入,
    // 不参与加密 (Acrobat/iText 如此, qpdf 解密时也跳过)
    let is_sig = dict.has(b"ByteRange");
    for (k, v) in dict.iter_mut() {
        if is_sig && k.as_slice() == b"Contents" {
            continue;
        }
        decrypt_object(v, aes_key, rc4_key, str_method, stm_method)?;
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
    fn test_decrypt_skip_text_rc4_v2() {
        // V4/R4 但 CFM=/V2 实际用 RC4 加密 (AES 路径会报 "数据长度非法", 需按 RC4 解密)
        let path = r"C:\Users\29115\RustroverProjects\validators\ts\skip-text.pdf";
        let data = std::fs::read(path).unwrap();

        let dec = crate::read::decrypt_pdf(&data).expect("解密失败");
        assert!(!crate::read::is_encrypted(&dec));
        let file = pdf::file::FileOptions::cached()
            .load(&dec[..])
            .expect("解密副本无法解析");
        assert!(file.pages().count() >= 1);
    }

    #[test]
    fn test_decrypt_signed_aesv2() {
        // iText 增量签署的 AESV2 加密 PDF: 签名字典 /Contents 为明文,
        // /DigestValue 长度非块对齐, 均不应导致解密中止
        let path = r"C:\Users\29115\RustroverProjects\validators\ts\edit.pdf";
        let data = std::fs::read(path).unwrap();

        let dec = crate::read::decrypt_pdf(&data).expect("解密失败");
        assert!(!crate::read::is_encrypted(&dec));
        let file = pdf::file::FileOptions::cached()
            .load(&dec[..])
            .expect("解密副本无法解析");
        assert!(file.pages().count() >= 1);
    }

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

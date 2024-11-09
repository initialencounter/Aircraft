#[tauri::command]
pub async fn get_login_status() -> bool {
    use crate::ziafp::LOGIN_STATUS;
    use std::sync::atomic::Ordering;
    let login_status = LOGIN_STATUS.load(Ordering::Relaxed);
    println!("login_status: {}", login_status);
    login_status
}
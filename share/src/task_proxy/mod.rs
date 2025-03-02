use crate::logger::LogMessage;
use http_client::HttpClient;
use std::sync::atomic::Ordering;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tokio::sync::watch;
use tokio::sync::Mutex;
pub mod http_client;
pub mod webhook;
pub use http_client::LOGIN_STATUS;
use crate::utils::popup_message;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub async fn run(
    base_url: String,
    username: String,
    password: String,
    port: u16,
    debug: bool,
    mut shutdown_rx: watch::Receiver<bool>,
    log_tx: Sender<LogMessage>,
) -> Result<()> {
    let client = Arc::new(Mutex::new(HttpClient::new(
        base_url.clone(),
        username.clone(),
        password.clone(),
        debug,
        log_tx.clone(),
        popup_message,
    )));
    client.lock().await.log("INFO", "开始运行").await;
    client
        .lock()
        .await
        .log("INFO", &format!("base_url: {}", base_url))
        .await;
    client
        .lock()
        .await
        .log("INFO", &format!("username: {}", username))
        .await;
    client
        .lock()
        .await
        .log("INFO", &format!("password: {}", password))
        .await;
    client
        .lock()
        .await
        .log("INFO", &format!("port: {}", port))
        .await;
    client
        .lock()
        .await
        .log("INFO", &format!("debug: {}", debug))
        .await;
    let _ = client.lock().await.login().await;
    let client_clone = client.clone();
    let heartbeat = tokio::spawn(async move {
        let mut last_heartbeat = std::time::Instant::now();
        loop {
            if !debug {
                LOGIN_STATUS.store(false, Ordering::Relaxed);
                // 检查距离上次心跳是否超过阈值
                if last_heartbeat.elapsed() > std::time::Duration::from_secs(60 * 30) {
                    client_clone
                        .lock()
                        .await
                        .log(
                            "WARN",
                            "检测到较长时间未进行心跳，可能是由于系统睡眠导致，开始重新登录",
                        )
                        .await;
                    client_clone.lock().await.login().await.unwrap();
                } else {
                    client_clone.lock().await.heartbeat().await.unwrap();
                }
                last_heartbeat = std::time::Instant::now();
            } else {
                LOGIN_STATUS.store(true, Ordering::Relaxed);
                client_clone
                    .lock()
                    .await
                    .log("INFO", "调试模式，跳过心跳")
                    .await;
            }
            tokio::time::sleep(std::time::Duration::from_secs(60 * 28)).await;
        }
    });

    let webhook_client = client.clone();
    let server_handle = webhook::apply_webhook(port, log_tx, webhook_client);

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        tokio::select! {
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    server_handle.abort();
                    heartbeat.abort();
                    break;
                }
            }
        }
    }
    LOGIN_STATUS.store(false, Ordering::Relaxed);
    client.lock().await.log("INFO", "服务已停止").await;
    Ok(())
}

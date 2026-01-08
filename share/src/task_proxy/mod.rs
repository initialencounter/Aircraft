use crate::utils::uploader::FileManager;
use aircraft_types::config::LLMConfig;
use aircraft_types::logger::LogMessage;
use http_client::HttpClient;
use std::sync::atomic::Ordering;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tokio::sync::watch;
use tokio::sync::Mutex;
pub mod http_client;
pub mod webhook;
use crate::utils::popup_message;
pub use http_client::LOGIN_STATUS;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub async fn run(
    base_url: String,
    username: String,
    password: String,
    port: u16,
    debug: bool,
    mut shutdown_rx: watch::Receiver<bool>,
    log_tx: Sender<LogMessage>,
    llm_config: LLMConfig,
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
    client.lock().await.log("INFO", "等待手动登录...").await;
    let client_clone = client.clone();

    let webhook_client = client.clone();
    let file_manager = Arc::new(Mutex::new(FileManager::new(llm_config)));
    let server_handle = webhook::apply_webhook(port, webhook_client, file_manager);

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        tokio::select! {
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    server_handle.abort();
                    break;
                }
            }
        }
    }
    LOGIN_STATUS.store(false, Ordering::Relaxed);
    client.lock().await.log("INFO", "服务已停止").await;
    Ok(())
}

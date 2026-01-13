use crate::config::ConfigManager;
use crate::manager::clipboard_snapshot_manager::ClipboardSnapshotManager;
use crate::manager::hotkey_manager::HotkeyManager;
use crate::utils::uploader::FileManager;
use aircraft_types::logger::LogMessage;
use http_client::HttpClient;
use std::sync::atomic::Ordering;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tokio::sync::watch;
pub mod http_client;
pub mod webhook;
use crate::utils::popup_message;
pub use http_client::LOGIN_STATUS;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub async fn run(mut shutdown_rx: watch::Receiver<bool>, log_tx: Sender<LogMessage>) -> Result<()> {
    let config = ConfigManager::get_config();
    let client = Arc::new(HttpClient::new(
        config.server.base_url.clone(),
        log_tx.clone(),
        popup_message,
    ));
    client.log("INFO", "开始运行").await;

    let webhook_client = client.clone();
    let file_manager = Arc::new(FileManager::new(config.llm));
    let hotkey_manager = Arc::new(HotkeyManager::new(
        crate::config::ConfigManager::get_config().hotkey,
        log_tx.clone(),
    ));
    hotkey_manager.start();
    let clipboard_snapshot_manager = Arc::new(ClipboardSnapshotManager::new());
    clipboard_snapshot_manager.start();
    let server_handle = webhook::apply_webhook(
        config.server.port,
        webhook_client,
        file_manager,
        hotkey_manager,
        clipboard_snapshot_manager,
    )
    .await;

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
    client.log("INFO", "服务已停止").await;
    Ok(())
}

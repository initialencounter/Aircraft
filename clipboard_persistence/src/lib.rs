#[cfg(windows)]
pub mod windows_clipboard;

#[cfg(windows)]
pub use windows_clipboard::{
    get_windows_clipboard_snapshot, restore_windows_clipboard_snapshot,
    WindowsClipboardSnapshot, WindowsClipboardFormat,
};
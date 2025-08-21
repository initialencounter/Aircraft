use std::env;
use std::path::PathBuf;
use std::process::Command;

pub fn request_admin_and_restart(current_exe: &PathBuf) -> bool {
    let status = Command::new("powershell")
        .arg("Start-Process")
        .arg("-Verb")
        .arg("RunAs")
        .arg(current_exe)
        .status()
        .expect("无法启动管理员进程");

    // 如果获取到管理员权限，则退出源程序
    if status.success() {
        return true;
    }
    false
}

pub fn is_launched_from_registry() -> bool {
    std::env::args().any(|arg| arg == "--from-registry")
}

pub fn restart_program() {
    let current_exe = env::current_exe().expect("无法获取当前执行文件路径");
    let _ = Command::new(current_exe).arg("--from-registry").spawn();
    std::process::exit(0);
}

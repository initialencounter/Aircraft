use tauri::{App, Wry};
use tauri::menu::{MenuItem, MenuItemBuilder};

pub fn create_menu_item(app: &mut App) -> [MenuItem<Wry>; 6] {
    let help_ = MenuItemBuilder::new("帮助(H)").id("help").build(app).unwrap();
    let quit = MenuItemBuilder::new("退出(X)").id("quit").build(app).unwrap();
    let hide = MenuItemBuilder::new("隐藏(H)").id("hide").build(app).unwrap();
    let about = MenuItemBuilder::new("关于(A)").id("about").build(app).unwrap();
    let update = MenuItemBuilder::new("检查更新(U)").id("update").build(app).unwrap();
    let restart_ = MenuItemBuilder::new("重启(R)").id("restart").build(app).unwrap();
    [help_, quit, hide, about, update, restart_]
}
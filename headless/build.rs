fn main() {
    let mut res = winres::WindowsResource::new();
    res.set_icon("./resources/favicon.ico");
    res.compile().unwrap();
}

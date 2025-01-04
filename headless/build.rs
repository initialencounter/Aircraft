fn main() {
  let mut res = winres::WindowsResource::new();
  res.set_icon("./resources/favicon.ico");
  res.compile().unwrap();
  println!("cargo:warning=正在构建服务端");
}
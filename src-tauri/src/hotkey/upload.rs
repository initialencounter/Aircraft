use reqwest::Client;

pub async fn upload_file(file_path: Vec<String>) -> () {
    let client = Client::new();
    let body = file_path;
    let response = client
        .post("http://127.0.0.1:25455/upload-selected")
        .json(&body)
        .send()
        .await;

    if response.is_ok() {
        ()
    }
}

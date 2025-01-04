use std::{env, fs, path::PathBuf};

pub fn modify_everything_config() -> Result<(), Box<dyn std::error::Error>> {
  let appdata = env::var("APPDATA")?;
  let config_path = PathBuf::from(appdata)
      .join("Everything")
      .join("Everything.ini");

  let content = fs::read_to_string(&config_path)?;
  
  let mut found_http_enabled = false;
  let mut found_http_port = false;
  
  let mut new_content = content
      .lines()
      .map(|line| {
          if line.starts_with("http_server_enabled=") {
              found_http_enabled = true;
              "http_server_enabled=1"
          } else if line.starts_with("http_server_port=") {
              found_http_port = true;
              "http_server_port=25456"
          } else {
              line
          }
      })
      .collect::<Vec<&str>>();

  // 如果配置项不存在，添加它们
  if !found_http_enabled {
      new_content.push("http_server_enabled=1");
  }
  if !found_http_port {
      new_content.push("http_server_port=25456");
  }

  fs::write(config_path, new_content.join("\n"))?;

  Ok(())
}


#[cfg(test)]
mod tests {
    use super::modify_everything_config;

    #[test]
    fn test_modify_everything_config() {
        modify_everything_config().unwrap();
    }
}
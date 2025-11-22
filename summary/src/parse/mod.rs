mod assign;
mod read;
mod regex;

pub use assign::parse_docx_table;
pub use read::parse_docx_text;
pub use regex::match_project_no;

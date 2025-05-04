mod modify_docx;
mod parse;
mod reader;
mod types;

pub use modify_docx::modify_docx;
pub use parse::{match_project_no, parse_docx_table, parse_docx_text};
pub use reader::{
    get_summary_info_by_buffer, get_summary_info_by_path, read_docx_content, read_docx_content_u8,
};
pub use types::*;

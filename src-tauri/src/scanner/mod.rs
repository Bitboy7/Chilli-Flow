mod catalog;
mod engine;

pub use catalog::{normalize_extension, DawCatalog, KNOWN_DAWS};
pub use engine::scan_directory;

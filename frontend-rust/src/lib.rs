// src/lib.rs

pub mod app;
pub mod views;
pub mod state;
pub mod models;
pub mod api;
pub mod components; // Ensure components module is declared
pub mod auth;
pub mod style; // Ensure style module is declared
pub mod utils;

// Remove sub-module declarations from here if they are inside `components/mod.rs` etc.
// Example: pub mod archive is now likely inside `components/mod.rs` or `views/mod.rs`